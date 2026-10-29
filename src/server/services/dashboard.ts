import type { Prisma } from "@prisma/client";
import { addDays, instantToLocalDate, localDateTimeToInstant, makeLocalDate, parseLocalDate, type LocalDate } from "@/domain/dates";
import type { Priority, TaskCategory } from "@/domain/enums";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { buildTaskWhere, taskListInclude } from "./tasks";

export interface DashboardFilters {
  from?: LocalDate;
  to?: LocalDate;
  clientId?: string;
  assigneeId?: string;
  category?: TaskCategory;
  priority?: Priority;
}

export function defaultPeriod(now = new Date()): { from: LocalDate; to: LocalDate } {
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const { y, m } = parseLocalDate(today);
  return { from: makeLocalDate(y, m, 1), to: today };
}

const OPEN = { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } satisfies Prisma.TaskWhereInput;

export async function managerDashboard(actor: Actor, filters: DashboardFilters, now = new Date()) {
  assertCan(actor, "dashboard.view");
  const period = { ...defaultPeriod(now), ...Object.fromEntries(Object.entries({ from: filters.from, to: filters.to }).filter(([, v]) => v)) } as {
    from: LocalDate;
    to: LocalDate;
  };
  const base = buildTaskWhere(actor, {
    clientId: filters.clientId,
    assigneeId: filters.assigneeId,
    category: filters.category,
    priority: filters.priority,
  });
  const where = (extra: Prisma.TaskWhereInput): Prisma.TaskWhereInput => ({ AND: [base, extra] });

  const today = instantToLocalDate(now, APP_TIMEZONE);
  const todayStart = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const tomorrowStart = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const next7End = localDateTimeToInstant(addDays(today, 8), "00:00", APP_TIMEZONE);
  const periodStart = localDateTimeToInstant(period.from, "00:00", APP_TIMEZONE);
  const periodEnd = localDateTimeToInstant(addDays(period.to, 1), "00:00", APP_TIMEZONE);

  const list = (extra: Prisma.TaskWhereInput, orderBy: Prisma.TaskOrderByWithRelationInput[] = [{ dueAt: "asc" }]) =>
    prisma.task.findMany({ where: where(extra), include: taskListInclude, orderBy, take: 8 });
  const count = (extra: Prisma.TaskWhereInput) => prisma.task.count({ where: where(extra) });

  const dueTodayW = { ...OPEN, dueAt: { gte: todayStart, lt: tomorrowStart } };
  const overdueW = { ...OPEN, dueAt: { lt: now } };
  const waitingClientW = { status: "AGUARDANDO_CLIENTE" } as const;
  const reviewW = { status: "EM_REVISAO" } as const;
  const next7W = { ...OPEN, dueAt: { gte: tomorrowStart, lt: next7End } };

  const [
    dueToday,
    dueTodayCount,
    overdue,
    overdueCount,
    waitingClient,
    waitingClientCount,
    waitingThirdCount,
    review,
    reviewCount,
    next7,
    next7Count,
    workloadRaw,
    overdueByAssignee,
    overdueByClient,
    completed,
  ] = await Promise.all([
    list(dueTodayW),
    count(dueTodayW),
    list(overdueW),
    count(overdueW),
    list(waitingClientW, [{ updatedAt: "asc" }]),
    count(waitingClientW),
    count({ status: "AGUARDANDO_TERCEIRO" }),
    list(reviewW, [{ updatedAt: "asc" }]),
    count(reviewW),
    list(next7W),
    count(next7W),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: where(OPEN),
      _count: { _all: true },
      _sum: { estimatedMinutes: true },
    }),
    prisma.task.groupBy({ by: ["assigneeId"], where: where(overdueW), _count: { _all: true } }),
    prisma.task.groupBy({
      by: ["clientId"],
      where: where(overdueW),
      _count: { _all: true },
      orderBy: { _count: { clientId: "desc" } },
      take: 5,
    }),
    prisma.task.findMany({
      where: where({ status: "CONCLUIDA", completedAt: { gte: periodStart, lt: periodEnd } }),
      select: { completedAt: true, dueAt: true },
    }),
  ]);

  const userIds = workloadRaw.map((w) => w.assigneeId).filter((x): x is string => !!x);
  const clientIds = overdueByClient.map((c) => c.clientId);
  const [users, clients] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, tradeName: true } }),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const overdueMap = new Map(overdueByAssignee.map((o) => [o.assigneeId, o._count._all]));
  const workload = workloadRaw
    .map((w) => ({
      assigneeId: w.assigneeId,
      name: w.assigneeId ? userName.get(w.assigneeId) ?? "—" : "Sem responsável",
      open: w._count._all,
      overdue: overdueMap.get(w.assigneeId) ?? 0,
      estimatedMinutes: w._sum.estimatedMinutes ?? 0,
    }))
    .sort((a, b) => b.open - a.open);
  const clientName = new Map(clients.map((c) => [c.id, c.tradeName]));
  const topOverdueClients = overdueByClient.map((c) => ({
    clientId: c.clientId,
    name: clientName.get(c.clientId) ?? "—",
    overdue: c._count._all,
  }));
  const onTime = completed.filter((t) => t.completedAt && t.completedAt <= t.dueAt).length;

  return {
    period,
    today,
    dueToday: { count: dueTodayCount, rows: dueToday },
    overdue: { count: overdueCount, rows: overdue },
    waitingClient: { count: waitingClientCount, rows: waitingClient },
    waitingThirdCount,
    review: { count: reviewCount, rows: review },
    next7: { count: next7Count, rows: next7 },
    workload,
    topOverdueClients,
    onTime: { completed: completed.length, onTime, rate: completed.length ? onTime / completed.length : null },
  };
}

/** Painel "Minha operação" do usuário logado. */
export async function myOperation(actor: Actor, now = new Date()) {
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const todayStart = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const tomorrowStart = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const horizon = localDateTimeToInstant(addDays(today, 15), "00:00", APP_TIMEZONE);
  const base = buildTaskWhere(actor, { assigneeId: actor.userId, open: true });
  const q = (extra: Prisma.TaskWhereInput, take = 50) =>
    prisma.task.findMany({
      where: { AND: [base, extra] },
      include: taskListInclude,
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take,
    });
  const [overdue, todayTasks, upcoming, returned, toReview, pendings] = await Promise.all([
    q({ dueAt: { lt: now } }),
    q({ dueAt: { gte: now, lt: tomorrowStart } }),
    q({ dueAt: { gte: tomorrowStart, lt: horizon }, status: { in: ["A_FAZER", "EM_ANDAMENTO"] } }, 30),
    q({ returnCount: { gt: 0 }, status: "EM_ANDAMENTO" }),
    prisma.task.findMany({
      where: { AND: [buildTaskWhere(actor, { reviewerId: actor.userId }), { status: "EM_REVISAO" }] },
      include: taskListInclude,
      orderBy: { updatedAt: "asc" },
    }),
    prisma.pending.findMany({
      where: { organizationId: actor.organizationId, resolvedAt: null, task: { AND: [base] } },
      include: { task: { select: { id: true, title: true, status: true } }, client: { select: { id: true, tradeName: true } } },
      orderBy: { followUpAt: "asc" },
    }),
  ]);
  return { today, todayStart, overdue, todayTasks, upcoming, returned, toReview, pendings };
}
