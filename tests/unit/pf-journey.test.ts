import { describe, expect, it } from "vitest";
import { PF_STAGES, PF_STATUSES, addDaysIso, addMonthsIso, pfDeadlines, stageOfStatus, statusForContinuity } from "@/domain/pf-journey";

describe("jornada PF", () => {
  it("tem 13 status e 10 etapas", () => {
    expect(PF_STATUSES).toHaveLength(13);
    expect(PF_STAGES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("calcula fim dos 30 dias e do bônus de 3 meses", () => {
    expect(pfDeadlines({ startDate: "2026-12-01", appBonusStart: "2026-11-30" })).toEqual({ endDate: "2026-12-31", appBonusEnd: "2027-02-28" });
    expect(pfDeadlines({})).toEqual({ endDate: null, appBonusEnd: null });
    expect(addDaysIso("2026-02-20", 30)).toBe("2026-03-22");
    expect(addMonthsIso("2026-11-30", 3)).toBe("2027-02-28");
  });
  it("mapeia status para etapa e continuidade para status ativo", () => {
    expect(stageOfStatus("NOVO_INTERESSADO")).toBe(1);
    expect(stageOfStatus("ATIVO_ACOMPANHAMENTO")).toBe(10);
    expect(statusForContinuity("SEGUIR_SOZINHO")).toBe("ATIVO_APLICATIVO");
    expect(statusForContinuity("ACOMPANHAMENTO_MENSAL")).toBe("ATIVO_ACOMPANHAMENTO");
  });
});
