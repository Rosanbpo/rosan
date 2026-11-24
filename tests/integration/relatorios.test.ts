import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { currentMonth } from "@/server/services/portfolio";
import { monthlyReport, monthlyReportCsv } from "@/server/services/reports";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

describe("relatório do mês", () => {
  it("conta entregas, pontualidade e pendências", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [], responsibleOperatorId: s.op.userId });
    const now = new Date();
    const hour = 3600 * 1000;
    const mk = (title: string, data: Record<string, unknown>) =>
      prisma.task.create({ data: { organizationId: s.admin.organizationId, clientId: c.id, title, category: "OUTRAS", priority: "NORMAL", createdById: s.admin.userId, assigneeId: s.op.userId, dueAt: new Date(now.getTime() + hour), ...data } as never });
    await mk("No prazo", { status: "CONCLUIDA", completedAt: new Date(now.getTime() - hour), dueAt: now });
    await mk("Atrasada concluída", { status: "CONCLUIDA", completedAt: now, dueAt: new Date(now.getTime() - 2 * hour) });
    await mk("Aberta vencida", { status: "A_FAZER", dueAt: new Date(now.getTime() - 48 * hour) });
    const r = await monthlyReport(s.admin, currentMonth(), now);
    expect(r.completed).toBe(2);
    expect(r.onTime).toBe(1);
    expect(r.onTimePct).toBe(50);
    expect(r.overdueNow).toBe(1);
    expect(r.perPerson[0]).toMatchObject({ count: 2 });
    expect(r.perDay.reduce((a, b) => a + b, 0)).toBe(2);
    expect(r.backlog).toHaveLength(1);
    const csv = await monthlyReportCsv(s.admin, currentMonth());
    expect(csv).toContain("Cliente;Tarefa");
    expect(csv).toContain("Aberta vencida");
  });
  it("operador não acessa", async () => {
    const s = await setupOrg();
    await expect(monthlyReport(s.op, currentMonth())).rejects.toBeInstanceOf(ForbiddenError);
  });
});
