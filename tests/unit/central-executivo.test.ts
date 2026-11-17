import { describe, expect, it } from "vitest";
import { capacity, goalForecast } from "@/domain/executive";
import { clientHealth } from "@/domain/health";

describe("saúde do cliente", () => {
  it("cliente sem problemas tem nota 100", () => {
    expect(clientHealth({ overdueTasks: 0, openPendings: 0, missingDocuments: 0, doneLast30: 10, doneOnTimeLast30: 10 })).toMatchObject({ score: 100, level: "SAUDAVEL", reasons: [] });
  });
  it("atrasos, pendências e documentos reduzem a nota com teto por item", () => {
    const h = clientHealth({ overdueTasks: 10, openPendings: 10, missingDocuments: 10, doneLast30: 0, doneOnTimeLast30: 0 });
    expect(h.score).toBe(20);
    expect(h.level).toBe("RISCO");
    expect(h.reasons).toHaveLength(3);
  });
  it("pontualidade baixa pesa até 20 pontos", () => {
    expect(clientHealth({ overdueTasks: 0, openPendings: 0, missingDocuments: 0, doneLast30: 10, doneOnTimeLast30: 0 }).score).toBe(80);
    expect(clientHealth({ overdueTasks: 2, openPendings: 0, missingDocuments: 0, doneLast30: 0, doneOnTimeLast30: 0 })).toMatchObject({ score: 84, level: "SAUDAVEL" });
    expect(clientHealth({ overdueTasks: 3, openPendings: 1, missingDocuments: 0, doneLast30: 0, doneOnTimeLast30: 0 })).toMatchObject({ score: 71, level: "ATENCAO" });
  });
});

describe("meta de crescimento", () => {
  it("já atingida", () => {
    expect(goalForecast({ current: 10000, goal: 8000, growthPerMonth: 0, today: "2026-11-17" })).toMatchObject({ reached: true });
  });
  it("sem crescimento não há previsão", () => {
    expect(goalForecast({ current: 5000, goal: 8000, growthPerMonth: 0, today: "2026-11-17" })).toEqual({ reached: false, months: null, date: null });
  });
  it("calcula meses e data, inclusive virando o ano e fim de mês", () => {
    expect(goalForecast({ current: 5000, goal: 8000, growthPerMonth: 1000, today: "2026-11-17" })).toEqual({ reached: false, months: 3, date: "2027-02-17" });
    expect(goalForecast({ current: 0, goal: 1000, growthPerMonth: 1000, today: "2026-01-31" })).toEqual({ reached: false, months: 1, date: "2026-02-28" });
  });
});

describe("capacidade", () => {
  it("calcula ocupação, folga e quantos clientes cabem", () => {
    const c = capacity({ capacityHours: 130, usedMinutes: 60 * 50, plannedMinutes: 60 * 20, activeClients: 5 });
    expect(c).toMatchObject({ usedHours: 50, plannedHours: 20, occupancy: 54, hoursPerClient: 10 });
    expect(c.freeHours).toBe(40.5);
    expect(c.clientsThatFit).toBe(4);
  });
  it("sem horas apontadas não estima clientes", () => {
    expect(capacity({ capacityHours: 100, usedMinutes: 0, plannedMinutes: 0, activeClients: 0 }).clientsThatFit).toBeNull();
  });
});
