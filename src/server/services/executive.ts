import { addDays, instantToLocalDate, localDateToDbDate, localDateTimeToInstant, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { capacity, goalForecast } from "@/domain/executive";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { businessGoalsSchema, parseInput } from "../validation";
import { recordAudit } from "./audit";
import { centralOverview } from "./central";
import { currentMonth, getPortfolio } from "./portfolio";
import { buildTaskWhere } from "./tasks";

export async function setBusinessGoals(actor: Actor, raw: unknown) {
  assertCan(actor, "org.settings");
  const input = parseInput(businessGoalsSchema, raw);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: actor.organizationId },
      data: {
        revenueGoal: input.revenueGoal ?? null,
        revenueGoalDate: input.revenueGoalDate ? localDateToDbDate(input.revenueGoalDate) : null,
        capacityHours: input.capacityHours ?? null,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Organization",
      entityId: actor.organizationId,
      action: "org.goals_updated",
      summary: "Metas e capacidade atualizadas",
    });
  });
}

/** Painel executivo: receita recorrente, meta de crescimento, capacidade e clientes em risco. */
export async function executiveOverview(actor: Actor, now = new Date()) {
  assertCan(actor, "finance.view");
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const month = currentMonth();
  const { y, m } = parseLocalDate(today);
  const monthStart = localDateTimeToInstant(makeLocalDate(y, m, 1), "00:00", APP_TIMEZONE);
  const monthEnd = localDateTimeToInstant(makeLocalDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1), "00:00", APP_TIMEZONE);
  const ninetyAgo = localDateTimeToInstant(addDays(today, -90), "00:00", APP_TIMEZONE);

  const [org, portfolio, central, implantation, overdue, planned, recent] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: { revenueGoal: true, revenueGoalDate: true, capacityHours: true },
    }),
    getPortfolio(actor, month),
    centralOverview(actor, now),
    prisma.client.count({ where: { organizationId: actor.organizationId, archivedAt: null, status: "IMPLANTACAO" } }),
    prisma.task.count({ where: { AND: [buildTaskWhere(actor, { open: true }), { dueAt: { lt: now } }] } }),
    prisma.task.aggregate({
      where: { AND: [buildTaskWhere(actor, { open: true }), { dueAt: { gte: monthStart, lt: monthEnd } }] },
      _sum: { estimatedMinutes: true },
    }),
    prisma.client.findMany({
      where: { organizationId: actor.organizationId, archivedAt: null, status: "ATIVO", createdAt: { gte: ninetyAgo }, monthlyFee: { not: null } },
      select: { monthlyFee: true },
    }),
  ]);

  const mrr = portfolio.totals.mrr;
  const growthPerMonth = Math.round((recent.reduce((a, c) => a + Number(c.monthlyFee ?? 0), 0) / 3) * 100) / 100;
  const goal = org.revenueGoal === null ? null : Number(org.revenueGoal);
  const forecast = goal === null ? null : goalForecast({ current: mrr, goal, growthPerMonth, today });
  const cap =
    org.capacityHours === null
      ? null
      : capacity({
          capacityHours: org.capacityHours,
          usedMinutes: portfolio.totals.minutes,
          plannedMinutes: planned._sum.estimatedMinutes ?? 0,
          activeClients: portfolio.totals.activeClients,
        });

  return {
    month,
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    averageTicket: portfolio.totals.averageTicket,
    activeClients: portfolio.totals.activeClients,
    implantationClients: implantation,
    overdueTasks: overdue,
    hours: Math.round((portfolio.totals.minutes / 60) * 10) / 10,
    margin: portfolio.totals.margin,
    cost: portfolio.totals.cost,
    marginPct: portfolio.totals.margin !== null && mrr > 0 ? Math.round((portfolio.totals.margin / mrr) * 100) : null,
    goal: goal === null ? null : { value: goal, date: org.revenueGoalDate ? org.revenueGoalDate.toISOString().slice(0, 10) : null, progress: goal > 0 ? Math.min(100, Math.round((mrr / goal) * 100)) : 0, growthPerMonth, forecast },
    capacity: cap,
    capacityHours: org.capacityHours,
    atRisk: central.health.filter((h) => h.level !== "SAUDAVEL").slice(0, 6),
    topClients: [...portfolio.rows].filter((r) => r.status === "ATIVO" && r.monthlyFee !== null).sort((a, b) => (b.monthlyFee ?? 0) - (a.monthlyFee ?? 0)).slice(0, 5),
  };
}
