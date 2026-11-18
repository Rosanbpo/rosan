import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { createVaultItem, deleteVaultItem, listVault, revealVaultSecret, vaultAccessLog } from "@/server/services/vault";
import { resetDb, setupOrg } from "./helpers";

const OLD = process.env.VAULT_ENCRYPTION_KEY;
beforeAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = "chave-de-teste-com-mais-de-16-caracteres";
});
afterAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = OLD;
});
beforeEach(resetDb);

describe("cofre do cliente", () => {
  it("guarda criptografado, revela e audita", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [s.op.userId] });
    const item = await createVaultItem(s.admin, c.id, { category: "BANCO", label: "Banco X", username: "operador1", secret: "S3nh@-teste" });
    const raw = await prisma.clientVaultItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(raw.secretEnc).toBeTruthy();
    expect(raw.secretEnc).not.toContain("S3nh@-teste");
    const list = await listVault(s.op, c.id);
    expect(JSON.stringify(list)).not.toContain("S3nh@");
    expect(list[0]).toMatchObject({ label: "Banco X", hasSecret: true });
    expect((await revealVaultSecret(s.op, item.id)).secret).toBe("S3nh@-teste");
    const log = await vaultAccessLog(s.admin, c.id);
    expect(log.some((l) => l.summary.startsWith("Senha visualizada"))).toBe(true);
    await expect(createVaultItem(s.op, c.id, { category: "BANCO", label: "Outro", secret: "x" })).rejects.toBeInstanceOf(ForbiddenError);
    await deleteVaultItem(s.admin, item.id);
    expect(await listVault(s.admin, c.id)).toHaveLength(0);
  });
  it("sem chave não guarda senha", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [] });
    delete process.env.VAULT_ENCRYPTION_KEY;
    await expect(createVaultItem(s.admin, c.id, { category: "BANCO", label: "Banco", secret: "abc" })).rejects.toThrow(/cofre/i);
    process.env.VAULT_ENCRYPTION_KEY = "chave-de-teste-com-mais-de-16-caracteres";
  });
});
