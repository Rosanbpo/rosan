import { describe, expect, it } from "vitest";
import { calculatePricing, DEFAULT_PRICING, totalCosts } from "@/domain/pricing";
import { buildContractClauses, buildDistratoClauses, extenso, fillTokens, longDate, numeroExtenso, settlementBalance } from "@/domain/contract";

describe("precificação (lógica da planilha)", () => {
  it("reproduz o custo/hora da planilha da Rosan", () => {
    const r = calculatePricing(DEFAULT_PRICING);
    expect(r.totalCosts).toBe(8541);
    expect(r.hoursPerMonth).toBe(126);
    expect(r.minHourCost).toBe(67.79);
    expect(r.hourCost).toBe(74.56);
  });

  it("calcula custo, preço sugerido, imposto e lucro por plano", () => {
    const r = calculatePricing(DEFAULT_PRICING);
    const avancado = r.plans[2];
    expect(avancado.minutes).toBe(1126); // 18h46
    expect(avancado.cost).toBeCloseTo(1399.32, 1);
    expect(avancado.suggestedPrice).toBeCloseTo(avancado.cost * 1.6, 1);
    expect(avancado.price).toBe(1500);
    expect(avancado.tax).toBe(90);
    expect(avancado.profit).toBeCloseTo(1500 - avancado.cost - 90, 1);
  });

  it("sem preço praticado, arredonda o sugerido para a dezena acima", () => {
    const r = calculatePricing({ ...DEFAULT_PRICING, plans: [{ name: "X", finalPrice: null, tasks: [{ name: "t", minutes: 60 }] }] });
    expect(r.plans[0].price % 10).toBe(0);
    expect(r.plans[0].price).toBeGreaterThanOrEqual(r.plans[0].suggestedPrice);
  });

  it("não quebra com horas zeradas ou valores inválidos", () => {
    expect(calculatePricing({ ...DEFAULT_PRICING, hoursPerDay: 0 }).hourCost).toBe(0);
    expect(totalCosts([{ label: "a", amount: NaN }, { label: "b", amount: 10 }])).toBe(10);
  });
});

describe("modelos de contrato e distrato", () => {
  it("escreve números por extenso", () => {
    expect(extenso(6)).toBe("seis");
    expect(extenso(21)).toBe("vinte e um");
    expect(numeroExtenso(12)).toBe("12 (doze)");
    expect(longDate("2026-11-11")).toBe("11 de novembro de 2026");
  });

  it("preenche marcadores e deixa lacunas quando faltam dados", () => {
    const text = "Início {{inicio}}, {{vigencia}}, dia {{dia_pagamento}}, foro {{cidade}}.";
    expect(fillTokens(text, { inicio: "2026-12-01", vigenciaMeses: 6, diaPagamento: 10, cidade: "Goiânia/GO" })).toBe(
      "Início 01/12/2026, 6 (seis) meses, dia 10, foro Goiânia/GO.",
    );
    expect(fillTokens(text, {})).toContain("___/___/______");
  });

  it("contrato padrão traz as cláusulas do modelo, com revisão do plano aos 3 meses", () => {
    const clauses = buildContractClauses();
    expect(clauses.length).toBe(16);
    expect(clauses.some((c) => c.block === "fee")).toBe(true);
    expect(clauses.map((c) => c.text).join(" ")).toContain("3 (três) meses");
  });

  it("distrato padrão e saldo de quitação", () => {
    expect(buildDistratoClauses().some((c) => c.block === "values")).toBe(true);
    expect(settlementBalance({ pendingMonthly: 1000, unbilled: 250.5, credits: 100 })).toBe(1150.5);
  });
});
