import { localDateTimeToInstant, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";

/** Painel da equipe: carga, atrasos, entregas e horas de cada pessoa no mês. */
export async function teamOverview(actor: Actor, month: string, now = new Date()) {
  assertCan(actor, "dashboard.view");
  const { y, m } = parseLocalDate(`${month}-01`);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const from = localDateTimeToInstant(makeLocalDate(y, m, 1), "00:00", APP_TIMEZONE);
  const to = localDateTimeToInstant(makeLocalDate(next.y, next.m, 1), "00:00", APP_TIMEZONE);
  const org = { organizationId: actor.organizationId };
  const [members, open, overdue, done, time, org_] = await Promise.all([
    prisma.membership.findMany({ where: { ...org, active: true }, include: { user: { select: { id: true, name: true, email: true, active: true, totpEnabledAt: true, _count: { select: { clientMemberships: true } } } } }, orderBy: { user: { name: "asc" } } }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { ...org, status: { notIn: ["CONCLUIDA", "CANCELADA"] } }, _count: { _all: true } }),
    prisma.task.groupBy({ by: ["assigneeId"], where: { ...org, status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: now } }, _count: { _all: true } }),
    prisma.task.findMany({ where: { ...org, status: "CONCLUIDA", completedAt: { gte: from, lt: to } }, select: { assigneeId: true, completedAt: true, dueAt: true } }),
    prisma.timeEntry.groupBy({ by: ["userId"], where: { ...org, workedOn: { gte: from, lt: to } }, _sum: { minutes: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { capacityHours: true } }),
  ]);
  const count = (rows: Array<{ assigneeId: string | null; _count: { _all: number } }>) => new Map(rows.map((r) => [r.assigneeId, r._count._all]));
  const openBy = count(open);
  const overdueBy = count(overdue);
  const minutes = new Map(time.map((t) => [t.userId, t._sum.minutes ?? 0]));
  const rows = members.map((mb) => {
    const mine = done.filter((d) => d.assigneeId === mb.user.id);
    const onTime = mine.filter((d) => d.completedAt && d.dueAt && d.completedAt <= d.dueAt).length;
    return {
      userId: mb.user.id,
      name: mb.user.name,
      email: mb.user.email,
      role: mb.role,
      clients: mb.user._count.clientMemberships,
      twoFactor: !!mb.user.totpEnabledAt,
      open: openBy.get(mb.user.id) ?? 0,
      overdue: overdueBy.get(mb.user.id) ?? 0,
      completed: mine.length,
      onTimePct: mine.length ? Math.round((onTime / mine.length) * 100) : null,
      hours: Math.round(((minutes.get(mb.user.id) ?? 0) / 60) * 10) / 10,
    };
  });
  return { rows, capacityHours: org_.capacityHours ?? null };
}
