import { describe, expect, it } from "vitest";
import { analyze, chargedHourRate, recommend, type Diagnosis } from "@/domain/consultive-pricing";

const a = { minimumWage: 1621, hourCost: 40, overheadPct: 15, taxPct: 6 };
const d: Diagnosis = { regime: "SIMPLES", revenue: 80_000, bankAccounts: 2, statementLines: 600, entries: 200, employees: 3, inventory: false, multiCnpj: false, cardsAndMarketplaces: false, books: "ORGANIZADA", catchUpMonths: 0, wantsReports: true };

describe("precificação consultiva", () => {
  it("calcula a hora cobrada", () => expect(chargedHourRate(1621)).toBe(73.68));
  it("soma conciliação, lançamentos, folha e relatórios", () => {
    // 2*90 + 600*11/60 = 290; + 600 + 30 + 120 = 1040
    expect(analyze(d, a).minutes).toBe(1040);
  });
  it("recomenda ao menos o piso e o mínimo sustentável, com premium 20% acima", () => {
    const an = analyze(d, a);
    const r = recommend(d, an, a);
    expect(r.recommended).toBeGreaterThanOrEqual(r.floor);
    expect(r.recommended).toBeGreaterThanOrEqual(r.minimum);
    expect(r.premium).toBeGreaterThanOrEqual(r.recommended * 1.19);
    expect(r.margin(r.recommended)).toBeGreaterThan(0);
  });
  it("complexidade e risco sobem com desorganização", () => {
    const base = analyze(d, a);
    const bad = analyze({ ...d, books: "DESORGANIZADA", catchUpMonths: 4 }, a);
    expect(bad.complexity).toBeGreaterThan(base.complexity);
    expect(bad.risk).toBeGreaterThan(base.risk);
  });
});
