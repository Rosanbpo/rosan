import { startOfToday } from "@/domain/dates";
import { instantToLocalDate, localDateTimeToInstant, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/domain/enums";
import { toCsv } from "@/domain/csv";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { buildTaskWhere } from "./tasks";

function range(month: string) {
  const { y, m } = parseLocalDate(`${month}-01`);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return {
    from: localDateTimeToInstant(makeLocalDate(y, m, 1), "00:00", APP_TIMEZONE),
    to: localDateTimeToInstant(makeLocalDate(next.y, next.m, 1), "00:00", APP_TIMEZONE),
    days: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  };
}

/** Relatório do mês: entregas por dia, operador, cliente e situação, e o que ficou pendente. */
export async function monthlyReport(actor: Actor, month: string, now = new Date()) {
  assertCan(actor, "dashboard.view");
  const { from, to, days } = range(month);
  const scope = buildTaskWhere(actor, {});
  const [done, created, open, backlog] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [scope, { status: "CONCLUIDA", completedAt: { gte: from, lt: to } }] },
      select: { clientId: true, assigneeId: true, completedAt: true, dueAt: true, client: { select: { tradeName: true } }, assignee: { select: { name: true } } },
    }),
    prisma.task.count({ where: { AND: [scope, { createdAt: { gte: from, lt: to } }] } }),
    prisma.task.groupBy({ by: ["status"], where: { AND: [scope, { status: { notIn: ["CONCLUIDA", "CANCELADA"] } }, { dueAt: { lt: to } }] }, _count: { _all: true } }),
    prisma.task.findMany({
      where: { AND: [scope, { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: to } }] },
      orderBy: { dueAt: "asc" },
      take: 100,
      select: { id: true, title: true, status: true, dueAt: true, client: { select: { tradeName: true } }, assignee: { select: { name: true } } },
    }),
  ]);
  const perDay = Array.from({ length: days }, () => 0);
  const perPerson = new Map<string, number>();
  const perClient = new Map<string, number>();
  let onTime = 0;
  for (const t of done) {
    const day = Number(instantToLocalDate(t.completedAt!, APP_TIMEZONE).slice(8, 10));
    perDay[day - 1]!++;
    const person = t.assignee?.name ?? "Sem responsável";
    perPerson.set(person, (perPerson.get(person) ?? 0) + 1);
    const cn = t.client?.tradeName ?? "Interna";
    perClient.set(cn, (perClient.get(cn) ?? 0) + 1);
    if (t.completedAt! <= t.dueAt) onTime++;
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).map(([name, count]) => ({ name, count }));
  return {
    month,
    created,
    completed: done.length,
    onTime,
    onTimePct: done.length ? Math.round((onTime / done.length) * 100) : null,
    overdueNow: backlog.filter((b) => b.dueAt < startOfToday(now)).length,
    perDay,
    perPerson: top(perPerson),
    perClient: top(perClient).slice(0, 10),
    byStatus: open.map((o) => ({ status: o.status, label: STATUS_LABEL[o.status], count: o._count._all })),
    backlog: backlog.map((b) => ({ id: b.id, title: b.title, client: b.client?.tradeName ?? "Interna", assignee: b.assignee?.name ?? null, status: STATUS_LABEL[b.status], dueAt: b.dueAt })),
  };
}

/** Planilha CSV com todas as tarefas do mês (por prazo), para abrir no Excel. */
export async function monthlyReportCsv(actor: Actor, month: string): Promise<string> {
  assertCan(actor, "dashboard.view");
  const { from, to } = range(month);
  const tasks = await prisma.task.findMany({
    where: { AND: [buildTaskWhere(actor, {}), { dueAt: { gte: from, lt: to }, status: { not: "CANCELADA" } }] },
    orderBy: [{ dueAt: "asc" }],
    select: { title: true, category: true, status: true, dueAt: true, completedAt: true, estimatedMinutes: true, client: { select: { tradeName: true } }, assignee: { select: { name: true } } },
  });
  const fmt = (d: Date | null) => (d ? instantToLocalDate(d, APP_TIMEZONE) : "");
  return toCsv([
    ["Cliente", "Tarefa", "Categoria", "Responsável", "Prazo", "Status", "Concluída em", "No prazo", "Estimativa (min)"],
    ...tasks.map((t) => [
      t.client?.tradeName ?? "Interna",
      t.title,
      CATEGORY_LABEL[t.category],
      t.assignee?.name ?? "",
      fmt(t.dueAt),
      STATUS_LABEL[t.status],
      fmt(t.completedAt),
      t.completedAt ? (t.completedAt <= t.dueAt ? "Sim" : "Não") : "",
      t.estimatedMinutes ?? "",
    ]),
  ]);
}
