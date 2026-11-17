import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { centralOverview } from "@/server/services/central";
import { executiveOverview, setBusinessGoals } from "@/server/services/executive";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

async function scenario() {
  const s = await setupOrg();
  const client = await createClient(s.admin, {
    legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], monthlyFee: "2000",
    responsibleOperatorId: s.op.userId, managerId: s.gestor.userId, memberIds: [],
  });
  return { ...s, client };
}

describe("central operacional", () => {
  it("nota cai com tarefa atrasada e lista planejamento", async () => {
    const s = await scenario();
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const soon = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    await prisma.task.create({ data: { organizationId: s.admin.organizationId, clientId: s.client.id, title: "Atrasada", category: "OUTRAS", priority: "NORMAL", dueAt: past, createdById: s.admin.userId, estimatedMinutes: 30 } });
    await prisma.task.create({ data: { organizationId: s.admin.organizationId, clientId: s.client.id, title: "Em breve", category: "OUTRAS", priority: "NORMAL", dueAt: soon, createdById: s.admin.userId, estimatedMinutes: 90 } });
    const c = await centralOverview(s.admin);
    expect(c.health[0]).toMatchObject({ name: "Cliente", overdueTasks: 1, score: 92 });
    expect(c.planning.week).toMatchObject({ tasks: 1, minutes: 90 });
    expect(c.planning.month30.tasks).toBeGreaterThanOrEqual(1);
  });
  it("operador não acessa a central", async () => {
    const s = await scenario();
    await expect(centralOverview(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("painel executivo", () => {
  it("calcula receita, meta e capacidade", async () => {
    const s = await scenario();
    await setBusinessGoals(s.admin, { revenueGoal: "6000", revenueGoalDate: "2027-06-30", capacityHours: "130" });
    const e = await executiveOverview(s.admin);
    expect(e.mrr).toBe(2000);
    expect(e.arr).toBe(24000);
    expect(e.activeClients).toBe(1);
    expect(e.goal).toMatchObject({ value: 6000, progress: 33, date: "2027-06-30" });
    expect(e.goal?.growthPerMonth).toBeCloseTo(666.67, 1); // cliente criado agora entra no ritmo de 90 dias
    expect(e.capacity).not.toBeNull();
  });
  it("só administrador define metas e gestor vê o painel", async () => {
    const s = await scenario();
    await expect(setBusinessGoals(s.gestor, { revenueGoal: "1000" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(executiveOverview(s.gestor)).resolves.toBeTruthy();
    await expect(executiveOverview(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
