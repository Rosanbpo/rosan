import { describe, expect, it } from "vitest";
import { billingDaysLabel, checkSecondDue, installmentsClauseText, monthlyInstallments } from "@/domain/installments";

describe("mensalidade em dois vencimentos", () => {
  it("divide a mensalidade sem perder centavos", () => {
    const [a, b] = monthlyInstallments(1000.01, 25, 10, 50);
    expect(a).toEqual({ day: 10, amount: 500 });
    expect(b!.day).toBe(25);
    expect(a!.amount + b!.amount).toBeCloseTo(1000.01, 2);
  });
  it("um vencimento só quando não há segundo", () => {
    expect(monthlyInstallments(900, 10, null)).toEqual([{ day: 10, amount: 900 }]);
    expect(monthlyInstallments(900, 10, 10)).toHaveLength(1);
  });
  it("respeita o percentual do primeiro vencimento", () => {
    expect(monthlyInstallments(1000, 5, 20, 30)).toEqual([
      { day: 5, amount: 300 },
      { day: 20, amount: 700 },
    ]);
  });
  it("valida e descreve", () => {
    expect(checkSecondDue(10, 10)).toMatch(/outro dia/);
    expect(checkSecondDue(null, 15)).toMatch(/primeiro/);
    expect(checkSecondDue(10, 25)).toBeNull();
    expect(billingDaysLabel(25, 10)).toBe("dia 10 e dia 25");
    expect(installmentsClauseText(10, 25, 40)).toContain("40%");
    expect(installmentsClauseText(10)).toBe("10");
  });
});
