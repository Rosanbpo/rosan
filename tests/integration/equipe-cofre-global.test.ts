import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { createClient } from "@/server/services/clients";
import { teamOverview } from "@/server/services/team";
import { createVaultItem, listAllVault } from "@/server/services/vault";
import { resetDb, setupOrg } from "./helpers";

beforeAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = "chave-de-teste-com-mais-de-16-caracteres";
});
beforeEach(resetDb);

describe("equipe e cofre geral", () => {
  it("cofre geral respeita a carteira e nunca devolve segredo", async () => {
    const s = await setupOrg();
    const a = await createClient(s.admin, { legalName: "Alfa Comercio Ltda", tradeName: "Alfa Comercio", status: "ATIVO", services: [], memberIds: [s.op.userId] });
    const b = await createClient(s.admin, { legalName: "Beta Servicos Ltda", tradeName: "Beta Servicos", status: "ATIVO", services: [], memberIds: [] });
    await createVaultItem(s.admin, a.id, { category: "BANCO", label: "Banco A", secret: "segredo-a" });
    await createVaultItem(s.admin, b.id, { category: "BANCO", label: "Banco B", secret: "segredo-b" });
    const all = await listAllVault(s.admin);
    expect(all).toHaveLength(2);
    const mine = await listAllVault(s.op);
    expect(mine.map((i) => i.label)).toEqual(["Banco A"]);
    expect(JSON.stringify(all)).not.toContain("segredo");
    expect(await listAllVault(s.admin, { q: "beta" })).toHaveLength(1);
  });
  it("painel da equipe lista pessoas e exige permissão", async () => {
    const s = await setupOrg();
    const t = await teamOverview(s.admin, new Date().toISOString().slice(0, 7));
    expect(t.rows.length).toBeGreaterThanOrEqual(2);
    expect(t.rows[0]).toHaveProperty("overdue");
    await expect(teamOverview(s.op, "2026-11")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
