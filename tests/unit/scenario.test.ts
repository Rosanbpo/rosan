import { describe, expect, it } from "vitest";
import { simulate } from "@/domain/scenario";

const base = { mrr: 10000, clients: 5, hoursPerClient: 20, capacityHours: 160, hourCost: 40, taxPct: 6 };
const none = { newClients: 0, newTicket: 0, lostClients: 0, raisePct: 0, hoursChangePct: 0 };

describe("simulador de cenários", () => {
  it("sem mudanças mantém a base", () => {
    const r = simulate(base, none);
    expect(r.mrr).toBe(10000);
    expect(r.hours).toBe(100);
    expect(r.utilization).toBeCloseTo(0.625);
  });
  it("novos clientes aumentam MRR e horas; passa da capacidade", () => {
    const r = simulate(base, { ...none, newClients: 4, newTicket: 2000 });
    expect(r.clients).toBe(9);
    expect(r.mrr).toBe(18000);
    expect(r.hours).toBe(180);
    expect(r.extraCapacityNeeded).toBe(20);
  });
  it("perder cliente reduz pelo ticket médio", () => expect(simulate(base, { ...none, lostClients: 1 }).mrr).toBe(8000));
  it("reajuste aumenta o MRR", () => expect(simulate(base, { ...none, raisePct: 10 }).mrr).toBe(11000));
});
