import { describe, expect, it } from "vitest";
import { conversionRate, isOpenStage, weightedForecast } from "@/domain/crm";
import { clientProfitability, marginTone } from "@/domain/profitability";
import { parseDuration, parseMoney, projectSchema, timeEntrySchema } from "@/server/validation";

describe("rentabilidade por cliente", () => {
  it("calcula custo, margem e percentual", () => {
    const r = clientProfitability({ monthlyFee: 3000, minutes: 30 * 60, hourCost: 50 });
    expect(r.hours).toBe(30);
    expect(r.cost).toBe(1500);
    expect(r.margin).toBe(1500);
    expect(r.marginPct).toBeCloseTo(0.5);
  });

  it("margem negativa quando as horas custam mais que a mensalidade", () => {
    const r = clientProfitability({ monthlyFee: 1000, minutes: 40 * 60, hourCost: 50 });
    expect(r.margin).toBe(-1000);
    expect(marginTone(r.marginPct)).toBe("danger");
  });

  it("sem custo da hora ou sem mensalidade não inventa margem", () => {
    expect(clientProfitability({ monthlyFee: 1000, minutes: 600, hourCost: null }).margin).toBeNull();
    expect(clientProfitability({ monthlyFee: null, minutes: 600, hourCost: 50 }).marginPct).toBeNull();
    expect(marginTone(null)).toBe("neutral");
  });

  it("classifica a faixa de margem", () => {
    expect(marginTone(0.1)).toBe("danger");
    expect(marginTone(0.2)).toBe("warning");
    expect(marginTone(0.5)).toBe("success");
  });
});

describe("funil comercial", () => {
  it("previsão considera só leads em aberto, ponderados pela etapa", () => {
    const f = weightedForecast([
      { stage: "PROPOSTA", expectedFee: 2000 }, // 50%
      { stage: "NEGOCIACAO", expectedFee: 1000 }, // 70%
      { stage: "GANHO", expectedFee: 5000 },
      { stage: "PERDIDO", expectedFee: 5000 },
      { stage: "NOVO", expectedFee: null },
    ]);
    expect(f.openFee).toBe(3000);
    expect(f.weightedFee).toBe(1700);
  });

  it("conversão = ganhos ÷ encerrados", () => {
    expect(conversionRate(3, 1)).toBe(0.75);
    expect(conversionRate(0, 0)).toBeNull();
    expect(isOpenStage("GANHO")).toBe(false);
    expect(isOpenStage("REUNIAO")).toBe(true);
  });
});

describe("entrada de valores e horas", () => {
  it("interpreta dinheiro no formato brasileiro", () => {
    expect(parseMoney("1.500,50")).toBe(1500.5);
    expect(parseMoney("R$ 2.500")).toBe(2500);
    expect(parseMoney("2500.75")).toBe(2500.75);
    expect(parseMoney("")).toBeUndefined();
    expect(parseMoney("1.250.000")).toBe(1250000);
    expect(parseMoney("abc")).toBeNaN();
  });

  it("interpreta duração em h:mm, minutos e horas decimais", () => {
    expect(parseDuration("1:30")).toBe(90);
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("1,5")).toBe(90);
    expect(parseDuration("0:45")).toBe(45);
    expect(parseDuration("")).toBeUndefined();
  });

  it("valida apontamento de horas", () => {
    const ok = timeEntrySchema.safeParse({ workedOn: "2026-11-10", minutes: "1:30" });
    expect(ok.success && ok.data.minutes).toBe(90);
    expect(timeEntrySchema.safeParse({ workedOn: "2026-11-10", minutes: "0" }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ workedOn: "2026-11-10", minutes: "25:00" }).success).toBe(false);
  });

  it("projeto não pode terminar antes de começar", () => {
    const base = { name: "Implantação", status: "PLANEJADO" };
    expect(projectSchema.safeParse({ ...base, startDate: "2026-11-10", dueDate: "2026-11-01" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, startDate: "2026-11-01", dueDate: "2026-11-10" }).success).toBe(true);
  });
});
