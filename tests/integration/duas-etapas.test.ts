import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { totpAt } from "@/domain/totp";
import { prisma } from "@/server/db";
import { decryptSecret } from "@/server/crypto";
import { beginTwoFactorSetup, checkSecondFactor, confirmTwoFactorSetup, disableTwoFactor, resetTwoFactor } from "@/server/services/two-factor";
import { resetDb, setupOrg } from "./helpers";

const OLD = process.env.VAULT_ENCRYPTION_KEY;
beforeAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = "chave-de-teste-com-mais-de-16-caracteres";
});
afterAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = OLD;
});
beforeEach(resetDb);

async function enable(userId: string, actor: Parameters<typeof beginTwoFactorSetup>[0]) {
  const { secret } = await beginTwoFactorSetup(actor);
  const step = Math.floor(Date.now() / 1000 / 30);
  const codes = await confirmTwoFactorSetup(actor, totpAt(secret, step));
  return { secret, codes, step, userId };
}

describe("verificação em duas etapas", () => {
  it("ativa, guarda o segredo criptografado e aceita código de recuperação uma vez", async () => {
    const s = await setupOrg();
    const { secret, codes } = await enable(s.op.userId, s.op);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: s.op.userId } });
    expect(row.totpEnabledAt).toBeTruthy();
    expect(row.totpSecretEnc).not.toContain(secret);
    expect(decryptSecret(row.totpSecretEnc!)).toBe(secret);
    expect(codes).toHaveLength(8);
    expect(await checkSecondFactor(s.op.userId, codes[0]!)).toBe(true);
    expect(await checkSecondFactor(s.op.userId, codes[0]!)).toBe(false);
    expect(await checkSecondFactor(s.op.userId, "000000")).toBe(false);
  });
  it("não aceita o mesmo código do aplicativo duas vezes", async () => {
    const s = await setupOrg();
    const { secret, step } = await enable(s.op.userId, s.op);
    // o passo usado na ativação já foi gasto
    expect(await checkSecondFactor(s.op.userId, totpAt(secret, step))).toBe(false);
    expect(await checkSecondFactor(s.op.userId, totpAt(secret, step + 1))).toBe(true);
  });
  it("bloqueia depois de 5 erros", async () => {
    const s = await setupOrg();
    const { secret, step } = await enable(s.op.userId, s.op);
    for (let i = 0; i < 5; i++) await checkSecondFactor(s.op.userId, "111111");
    expect(await checkSecondFactor(s.op.userId, totpAt(secret, step + 1))).toBe(false);
  });
  it("desativa com senha e código; admin redefine de outro usuário", async () => {
    const s = await setupOrg();
    await prisma.user.update({ where: { id: s.op.userId }, data: { passwordHash: await bcrypt.hash("segredo-123", 4) } });
    const { secret, step } = await enable(s.op.userId, s.op);
    await expect(disableTwoFactor(s.op, "errada", totpAt(secret, step + 1))).rejects.toThrow(/senha/i);
    await disableTwoFactor(s.op, "segredo-123", totpAt(secret, step + 1));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: s.op.userId } })).totpEnabledAt).toBeNull();
    await enable(s.op.userId, s.op);
    await expect(resetTwoFactor(s.op, s.op.userId)).rejects.toBeInstanceOf(ForbiddenError);
    await resetTwoFactor(s.admin, s.op.userId);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: s.op.userId } })).totpEnabledAt).toBeNull();
  });
});
