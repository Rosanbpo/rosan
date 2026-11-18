import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { assertCan, ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { generateRecoveryCodes, generateTotpSecret, otpauthUri, verifyTotp } from "@/domain/totp";
import { prisma } from "../db";
import { decryptSecret, encryptSecret, vaultConfigured } from "../crypto";
import { recordAudit } from "./audit";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function twoFactorStatus(actor: Actor) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { totpEnabledAt: true, totpRecoveryHashes: true, totpSecretEnc: true } });
  return { enabled: !!u.totpEnabledAt, enabledAt: u.totpEnabledAt, recoveryLeft: u.totpRecoveryHashes.length, pending: !u.totpEnabledAt && !!u.totpSecretEnc, available: vaultConfigured() };
}

/** Passo 1: gera um segredo novo (ainda não vale) e o QR Code para o aplicativo autenticador. */
export async function beginTwoFactorSetup(actor: Actor) {
  if (!vaultConfigured()) throw new ValidationError("A verificação em duas etapas precisa da chave de criptografia do servidor (VAULT_ENCRYPTION_KEY).");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (user.totpEnabledAt) throw new ValidationError("A verificação em duas etapas já está ativa.");
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: encryptSecret(secret) } });
  const uri = otpauthUri(secret, user.email);
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

/** Passo 2: confirma com um código do aplicativo, ativa e entrega os códigos de recuperação (uma única vez). */
export async function confirmTwoFactorSetup(actor: Actor, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (user.totpEnabledAt) throw new ValidationError("A verificação em duas etapas já está ativa.");
  if (!user.totpSecretEnc) throw new ValidationError("Comece gerando o QR Code.");
  const step = verifyTotp(decryptSecret(user.totpSecretEnc), code);
  if (step === null) throw new ValidationError("Código incorreto. Confira o aplicativo e tente de novo.", { code: "Código incorreto." });
  const codes = generateRecoveryCodes();
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c.replace("-", ""), 8)));
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date(), totpLastStep: step, totpRecoveryHashes: hashes, totpFailures: 0, totpLockedUntil: null } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "User", entityId: user.id, action: "user.2fa_enabled", summary: "Verificação em duas etapas ativada" });
  });
  return codes;
}

/** Valida o segundo fator no login: código do aplicativo ou código de recuperação. */
export async function checkSecondFactor(userId: string, rawCode: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpEnabledAt || !user.totpSecretEnc) return true;
  if (user.totpLockedUntil && user.totpLockedUntil > new Date()) return false;
  const code = rawCode.replace(/[\s-]/g, "");
  let ok = false;
  try {
    const step = verifyTotp(decryptSecret(user.totpSecretEnc), code, Date.now(), user.totpLastStep);
    if (step !== null) {
      ok = true;
      await prisma.user.update({ where: { id: userId }, data: { totpLastStep: step, totpFailures: 0, totpLockedUntil: null } });
    }
  } catch {
    ok = false;
  }
  if (!ok && /^[A-Za-z2-7]{10}$/.test(code)) {
    for (let i = 0; i < user.totpRecoveryHashes.length; i++) {
      if (await bcrypt.compare(code.toUpperCase(), user.totpRecoveryHashes[i]!)) {
        const left = user.totpRecoveryHashes.filter((_, j) => j !== i);
        await prisma.user.update({ where: { id: userId }, data: { totpRecoveryHashes: left, totpFailures: 0, totpLockedUntil: null } });
        ok = true;
        break;
      }
    }
  }
  if (!ok) {
    const fails = user.totpFailures + 1;
    await prisma.user.update({ where: { id: userId }, data: { totpFailures: fails, totpLockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null, ...(fails >= MAX_FAILS ? { totpFailures: 0 } : {}) } });
  }
  return ok;
}

/** Desativa exigindo a senha e um código válido. */
export async function disableTwoFactor(actor: Actor, password: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new ValidationError("Senha incorreta.", { password: "Senha incorreta." });
  if (!(await checkSecondFactor(user.id, code))) throw new ValidationError("Código incorreto.", { code: "Código incorreto." });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [], totpFailures: 0, totpLockedUntil: null } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "User", entityId: user.id, action: "user.2fa_disabled", summary: "Verificação em duas etapas desativada" });
  });
}

/** Administrador libera alguém que perdeu o celular. */
export async function resetTwoFactor(actor: Actor, userId: string) {
  assertCan(actor, "org.settings");
  const m = await prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: actor.organizationId } } });
  if (!m) throw new NotFoundError("Usuário não encontrado.");
  if (userId === actor.userId) throw new ForbiddenError("Use a tela Minha conta para desativar a sua.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [], totpFailures: 0, totpLockedUntil: null } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "User", entityId: userId, action: "user.2fa_reset", summary: "Verificação em duas etapas redefinida por um administrador" });
  });
}
