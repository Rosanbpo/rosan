import { addMonths, instantToLocalDate, localDateToDbDate, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { assertCan, type Actor } from "@/domain/permissions";
import { clientProfitability } from "@/domain/profitability";
import { prisma } from "../db";
import { APP_TIMEZONE } from "../config";
import { assertClientAccess, clientScope } from "./access";

export function currentMonth(): string {
  return instantToLocalDate(new Date(), APP_TIMEZONE).slice(0, 7);
}

export function isMonth(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthRange(month: string) {
  const { y, m } = parseLocalDate(`${month}-01`);
  const next = addMonths(y, m, 1);
  return { from: localDateToDbDate(makeLocalDate(y, m, 1)), to: localDateToDbDate(makeLocalDate(next.y, next.m, 1)) };
}

export function shiftMonth(month: string, delta: number): string {
  const { y, m } = parseLocalDate(`${month}-01`);
  const t = addMonths(y, m, delta);
  return `${t.y}-${String(t.m).padStart(2, "0")}`;
}

/**
 * Carteira de clientes no mês: mensalidade, horas apontadas, custo e margem.
 * Disponível para quem pode ver valores (administrador e gestor).
 */
export async function getPortfolio(actor: Actor, month: string) {
  assertCan(actor, "finance.view");
  const { from, to } = monthRange(month);
  const now = new Date();
  const [org, clients] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { hourCost: true } }),
    prisma.client.findMany({
      where: { ...clientScope(actor), archivedAt: null, status: { not: "ENCERRADO" } },
      orderBy: { tradeName: "asc" },
      select: {
        id: true,
        tradeName: true,
        status: true,
        monthlyFee: true,
        billingDay: true,
        services: true,
        responsibleOperator: { select: { name: true } },
        manager: { select: { name: true } },
      },
    }),
  ]);
  const ids = clients.map((c) => c.id);
  const [time, open, overdue] = await Promise.all([
    prisma.timeEntry.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, workedOn: { gte: from, lt: to } },
      _sum: { minutes: true },
    }),
    prisma.task.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, status: { notIn: ["CONCLUIDA", "CANCELADA"] }, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: now }, archivedAt: null },
      _count: { _all: true },
    }),
  ]);
  const minutesBy = new Map(time.map((t) => [t.clientId, t._sum.minutes ?? 0]));
  const openBy = new Map(open.map((t) => [t.clientId, t._count._all]));
  const overdueBy = new Map(overdue.map((t) => [t.clientId, t._count._all]));
  const hourCost = org.hourCost === null ? null : Number(org.hourCost);

  const rows = clients.map((c) => {
    const monthlyFee = c.monthlyFee === null ? null : Number(c.monthlyFee);
    const minutes = minutesBy.get(c.id) ?? 0;
    return {
      id: c.id,
      tradeName: c.tradeName,
      status: c.status,
      billingDay: c.billingDay,
      services: c.services,
      operator: c.responsibleOperator?.name ?? null,
      manager: c.manager?.name ?? null,
      monthlyFee,
      minutes,
      openTasks: openBy.get(c.id) ?? 0,
      overdueTasks: overdueBy.get(c.id) ?? 0,
      ...clientProfitability({ monthlyFee, minutes, hourCost }),
    };
  });

  const active = rows.filter((r) => r.status === "ATIVO");
  const mrr = active.reduce((acc, r) => acc + (r.monthlyFee ?? 0), 0);
  const totalMinutes = rows.reduce((acc, r) => acc + r.minutes, 0);
  const cost = hourCost === null ? null : Math.round((totalMinutes / 60) * hourCost * 100) / 100;
  return {
    month,
    hourCost,
    rows,
    totals: {
      clients: rows.length,
      activeClients: active.length,
      withoutFee: active.filter((r) => r.monthlyFee === null).length,
      mrr: Math.round(mrr * 100) / 100,
      averageTicket: active.length ? Math.round((mrr / active.length) * 100) / 100 : null,
      minutes: totalMinutes,
      cost,
      margin: cost === null ? null : Math.round((mrr - cost) * 100) / 100,
    },
  };
}

export async function setHourCost(actor: Actor, value: number | undefined) {
  assertCan(actor, "org.settings");
  await prisma.organization.update({ where: { id: actor.organizationId }, data: { hourCost: value ?? null } });
}

/** Resumo do mês atual de um único cliente (mensalidade, horas, custo e margem). */
export async function clientMonthSummary(actor: Actor, clientId: string) {
  assertCan(actor, "finance.view");
  await assertClientAccess(actor, clientId);
  const { from, to } = monthRange(currentMonth());
  const [org, client, time] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { hourCost: true } }),
    prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { monthlyFee: true, billingDay: true } }),
    prisma.timeEntry.aggregate({ where: { clientId, workedOn: { gte: from, lt: to } }, _sum: { minutes: true } }),
  ]);
  const monthlyFee = client.monthlyFee === null ? null : Number(client.monthlyFee);
  const minutes = time._sum.minutes ?? 0;
  return {
    monthlyFee,
    billingDay: client.billingDay,
    minutes,
    ...clientProfitability({ monthlyFee, minutes, hourCost: org.hourCost === null ? null : Number(org.hourCost) }),
  };
}
