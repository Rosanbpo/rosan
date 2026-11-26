import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { assertCan, ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { clientScope } from "./access";
import { recordAudit } from "./audit";

const INVITE_DAYS = 7;
const RESET_HOURS = 2;
const SESSION_HOURS = 12;
const MAX_FAILS = 5;
const LOCK_MIN = 15;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const norm = (e: string) => e.trim().toLowerCase();

export function checkPassword(pw: string) {
  if (pw.length < 10) throw new ValidationError("A senha precisa ter pelo menos 10 caracteres.", { password: "Mínimo de 10 caracteres" });
  if (pw.length > 200) throw new ValidationError("A senha é longa demais.", { password: "Máximo de 200 caracteres" });
}

/** Cria (ou reaproveita) o usuário do portal e libera o acesso à empresa. Devolve o token do convite (mostrado uma vez). */
export async function inviteToPortal(actor: Actor, clientId: string, input: { name: string; email: string }) {
  assertCan(actor, "clients.manage");
  const name = input.name.trim();
  const email = norm(input.email);
  if (!name) throw new ValidationError("Informe o nome.", { name: "Obrigatório" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("E-mail inválido.", { email: "E-mail inválido" });
  const client = await prisma.client.findFirst({ where: { id: clientId, ...clientScope(actor) }, select: { id: true, tradeName: true } });
  if (!client) throw new NotFoundError("Cliente não encontrado");
  const existing = await prisma.portalUser.findUnique({ where: { email } });
  if (existing && existing.organizationId !== actor.organizationId) throw new ValidationError("Este e-mail já está em uso.", { email: "E-mail já em uso" });
  const token = newToken();
  const inviteExpiresAt = new Date(Date.now() + INVITE_DAYS * 86400000);
  const user = await prisma.$transaction(async (tx) => {
    const u = existing
      ? await tx.portalUser.update({ where: { id: existing.id }, data: existing.status === "ATIVO" ? {} : { inviteTokenHash: hashToken(token), inviteExpiresAt, name } })
      : await tx.portalUser.create({ data: { organizationId: actor.organizationId, email, name, inviteTokenHash: hashToken(token), inviteExpiresAt, createdById: actor.userId } });
    await tx.portalAccess.upsert({
      where: { portalUserId_clientId: { portalUserId: u.id, clientId } },
      create: { portalUserId: u.id, clientId, organizationId: actor.organizationId },
      update: { revokedAt: null },
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "PortalUser", entityId: u.id, action: "portal.invite", summary: `Acesso ao portal liberado para ${email} (${client.tradeName})`, clientId });
    return u;
  });
  return { user, token: user.status === "ATIVO" ? null : token, clientName: client.tradeName };
}

export async function listPortalUsers(actor: Actor, clientId: string) {
  assertCan(actor, "clients.manage");
  return prisma.portalAccess.findMany({
    where: { clientId, organizationId: actor.organizationId, client: clientScope(actor) },
    select: { revokedAt: true, createdAt: true, user: { select: { id: true, name: true, email: true, status: true, lastLoginAt: true, inviteExpiresAt: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function ownedUser(actor: Actor, id: string) {
  assertCan(actor, "clients.manage");
  const u = await prisma.portalUser.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!u) throw new NotFoundError("Usuário do portal não encontrado");
  return u;
}

export async function setPortalUserSuspended(actor: Actor, id: string, suspended: boolean) {
  const u = await ownedUser(actor, id);
  await prisma.$transaction(async (tx) => {
    await tx.portalUser.update({ where: { id }, data: { status: suspended ? "SUSPENSO" : u.passwordHash ? "ATIVO" : "CONVIDADO" } });
    if (suspended) await tx.portalSession.updateMany({ where: { portalUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "PortalUser", entityId: id, action: suspended ? "portal.suspend" : "portal.reactivate", summary: `${suspended ? "Suspendeu" : "Reativou"} o acesso de ${u.email} ao portal` });
  });
}

export async function revokePortalAccess(actor: Actor, id: string, clientId: string) {
  const u = await ownedUser(actor, id);
  await prisma.$transaction(async (tx) => {
    await tx.portalAccess.updateMany({ where: { portalUserId: id, clientId, organizationId: actor.organizationId }, data: { revokedAt: new Date() } });
    const left = await tx.portalAccess.count({ where: { portalUserId: id, revokedAt: null } });
    if (left === 0) await tx.portalSession.updateMany({ where: { portalUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "PortalUser", entityId: id, action: "portal.revoke", summary: `Removeu o acesso de ${u.email} a esta empresa no portal`, clientId });
  });
}

export async function reinvitePortalUser(actor: Actor, id: string) {
  const u = await ownedUser(actor, id);
  const token = newToken();
  await prisma.portalUser.update({ where: { id }, data: { inviteTokenHash: hashToken(token), inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 86400000) } });
  return { user: u, token };
}

/** Valida o convite e devolve o usuário (sem consumir o token). */
export async function findInvite(token: string) {
  const u = await prisma.portalUser.findUnique({ where: { inviteTokenHash: hashToken(token) } });
  if (!u || !u.inviteExpiresAt || u.inviteExpiresAt < new Date() || u.status === "SUSPENSO") return null;
  return u;
}

export async function acceptInvite(token: string, password: string, userAgent?: string) {
  checkPassword(password);
  const u = await findInvite(token);
  if (!u) throw new ValidationError("Este convite expirou ou já foi usado. Peça um novo à Rosan.");
  await prisma.portalUser.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(password, 12), status: "ATIVO", inviteTokenHash: null, inviteExpiresAt: null, failedLogins: 0, lockedUntil: null } });
  return createSession(u.id, userAgent);
}

export async function createSession(portalUserId: string, userAgent?: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600000);
  await prisma.portalSession.create({ data: { portalUserId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 200) } });
  await prisma.portalUser.update({ where: { id: portalUserId }, data: { lastLoginAt: new Date() } });
  return { token, expiresAt };
}

let dummy: string | undefined;
const GENERIC = "E-mail ou senha incorretos.";

export async function portalLogin(emailRaw: string, password: string, userAgent?: string) {
  const email = norm(emailRaw);
  const u = await prisma.portalUser.findUnique({ where: { email }, include: { accesses: { where: { revokedAt: null }, select: { clientId: true } } } });
  // Mesma resposta e mesmo custo quando o usuário não existe.
  const hash = u?.passwordHash ?? (dummy ??= bcrypt.hashSync("senha-inexistente", 12));
  const ok = await bcrypt.compare(password, hash);
  if (!u || !u.passwordHash) throw new ValidationError(GENERIC);
  if (u.lockedUntil && u.lockedUntil > new Date()) throw new ValidationError("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (!ok) {
    const fails = u.failedLogins + 1;
    await prisma.portalUser.update({ where: { id: u.id }, data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60000) } : { failedLogins: fails } });
    throw new ValidationError(GENERIC);
  }
  if (u.status !== "ATIVO") throw new ValidationError("Seu acesso está suspenso. Fale com a Rosan.");
  if (!u.accesses.length) throw new ValidationError("Seu usuário não está vinculado a nenhuma empresa. Fale com a Rosan.");
  await prisma.portalUser.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null } });
  return createSession(u.id, userAgent);
}

export async function requestPasswordReset(emailRaw: string) {
  const u = await prisma.portalUser.findUnique({ where: { email: norm(emailRaw) } });
  if (!u || u.status !== "ATIVO") return null;
  const token = newToken();
  await prisma.portalUser.update({ where: { id: u.id }, data: { resetTokenHash: hashToken(token), resetExpiresAt: new Date(Date.now() + RESET_HOURS * 3600000) } });
  return { user: u, token };
}

export async function findReset(token: string) {
  const u = await prisma.portalUser.findUnique({ where: { resetTokenHash: hashToken(token) } });
  if (!u || !u.resetExpiresAt || u.resetExpiresAt < new Date() || u.status !== "ATIVO") return null;
  return u;
}

export async function resetPassword(token: string, password: string) {
  checkPassword(password);
  const u = await findReset(token);
  if (!u) throw new ValidationError("Este link expirou. Peça um novo em “Esqueci minha senha”.");
  await prisma.$transaction([
    prisma.portalUser.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetExpiresAt: null, failedLogins: 0, lockedUntil: null } }),
    prisma.portalSession.updateMany({ where: { portalUserId: u.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export interface PortalSession {
  user: { id: string; name: string; email: string; organizationId: string };
  /** Empresas que este usuário pode ver. É a ÚNICA fonte para filtrar qualquer consulta do portal. */
  clients: { id: string; name: string }[];
}

export async function readSession(token: string | undefined): Promise<PortalSession | null> {
  if (!token) return null;
  const s = await prisma.portalSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { accesses: { where: { revokedAt: null }, include: { client: { select: { id: true, tradeName: true, archivedAt: true } } } } } } },
  });
  if (!s || s.revokedAt || s.expiresAt < new Date() || s.user.status !== "ATIVO") return null;
  const clients = s.user.accesses.filter((a) => !a.client.archivedAt).map((a) => ({ id: a.client.id, name: a.client.tradeName }));
  if (!clients.length) return null;
  return { user: { id: s.user.id, name: s.user.name, email: s.user.email, organizationId: s.user.organizationId }, clients };
}

export async function endSession(token: string | undefined) {
  if (token) await prisma.portalSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Garante que o usuário do portal pode ver esta empresa. Use antes de QUALQUER leitura ou escrita por clientId. */
export function assertPortalClient(session: PortalSession, clientId: string) {
  if (!session.clients.some((c) => c.id === clientId)) throw new ForbiddenError("Você não tem acesso a esta empresa.");
}
