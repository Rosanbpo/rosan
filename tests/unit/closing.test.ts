import { describe, expect, it } from "vitest";
import { closingProgress, isCompetenceMonth, shiftMonth } from "@/domain/closing";

describe("fechamento mensal", () => {
  it("valida e navega competências", () => {
    expect(isCompetenceMonth("2026-11")).toBe(true);
    expect(isCompetenceMonth("2026-13")).toBe(false);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("calcula o progresso", () => {
    expect(closingProgress([{ doneAt: new Date() }, { doneAt: null }])).toEqual({ done: 1, total: 2, pending: 1, pct: 50 });
    expect(closingProgress([]).pct).toBe(0);
  });
});
