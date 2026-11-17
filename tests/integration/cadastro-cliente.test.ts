import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { addBankAccount, listBankAccounts, removeBankAccount } from "@/server/services/bank-accounts";
import { createClient } from "@/server/services/clients";
import { exportClientsCsv, importClientsCsv } from "@/server/services/clients-import";
import { getPortfolio, currentMonth } from "@/server/services/portfolio";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

const base = (extra: Record<string, unknown> = {}) => ({
  legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [], ...extra,
});

describe("campos novos do cliente", () => {
  it("guarda etapa, software e custo direto e usa o custo direto na carteira", async () => {
    const s = await setupOrg();
    await prisma.organization.update({ where: { id: s.admin.organizationId }, data: { hourCost: 50 } });
    const c = await createClient(s.admin, base({ journeyStage: "ONBOARDING", software: "Omie", directCost: "150,00", monthlyFee: "2000" }));
    expect(c).toMatchObject({ journeyStage: "ONBOARDING", software: "Omie" });
    expect(Number(c.directCost)).toBe(150);
    const p = await getPortfolio(s.admin, currentMonth());
    expect(p.rows[0]).toMatchObject({ directCost: 150, cost: 150, margin: 1850 });
    expect(p.totals.cost).toBe(150);
  });
});

describe("contas bancárias", () => {
  it("adiciona, lista e remove; operador não edita", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, base({ responsibleOperatorId: s.op.userId }));
    const acc = await addBankAccount(s.admin, c.id, { bank: "Itaú", agency: "0001", account: "12345-6", kind: "Conta corrente" });
    expect(await listBankAccounts(s.admin, c.id)).toHaveLength(1);
    await expect(addBankAccount(s.op, c.id, { bank: "Nubank" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addBankAccount(s.admin, c.id, { bank: "" })).rejects.toBeInstanceOf(ValidationError);
    await removeBankAccount(s.admin, acc.id);
    expect(await listBankAccounts(s.admin, c.id)).toHaveLength(0);
  });
});

describe("importar e exportar clientes", () => {
  it("importa válidos, relata erros e exporta de volta", async () => {
    const s = await setupOrg();
    const csv = [
      "Razão social;Nome fantasia;CNPJ;Contato;E-mail;Telefone;Status;Etapa;Sistema financeiro;Mensalidade;Dia de vencimento;Início",
      "Padaria Ltda;Padaria;;Ana;ana@padaria.com;;Em implantação;Onboarding;Omie;2.500,00;5;",
      "Loja Ltda;Loja;;Bia;email-invalido;;Ativo;;;;;",
      "Oficina Ltda;Oficina;;;;;Ativo;Etapa Inexistente;;;;",
      "Escola Ltda;Escola;;;;;Ativo;Implantação;Nibo;1800;10;",
    ].join("\r\n");
    const r = await importClientsCsv(s.admin, csv);
    expect(r.errors).toMatchObject([{ line: 3 }, { line: 4 }]);
    expect(r.created).toBe(2);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4]);
    const padaria = await prisma.client.findFirstOrThrow({ where: { tradeName: "Padaria" } });
    expect(padaria).toMatchObject({ journeyStage: "ONBOARDING", software: "Omie", status: "IMPLANTACAO", billingDay: 5 });
    expect(Number(padaria.monthlyFee)).toBe(2500);
    const out = await exportClientsCsv(s.admin);
    expect(out).toContain("Padaria");
    expect(out).toContain("2500,00");
    expect(out.split("\r\n").filter(Boolean)).toHaveLength(3);
  });
  it("gestor não importa e operador não vê mensalidade na exportação", async () => {
    const s = await setupOrg();
    await expect(importClientsCsv(s.op, "a;b\n1;2")).rejects.toBeInstanceOf(ForbiddenError);
    await createClient(s.admin, base({ monthlyFee: "900", responsibleOperatorId: s.op.userId }));
    expect(await exportClientsCsv(s.op)).not.toContain("900,00");
    await expect(importClientsCsv(s.admin, "sem dados")).rejects.toBeInstanceOf(ValidationError);
  });
});
