import { startOfToday } from "@/domain/dates";
import { addDays, instantToLocalDate, localDateTimeToInstant, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { previousCompetence } from "@/domain/documents";
import { clientHealth } from "@/domain/health";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { clientScope } from "./access";
import { documentsOverview } from "./documents";
import { buildTaskWhere } from "./tasks";

const inst = (d: string) => localDateTimeToInstant(d, "00:00", APP_TIMEZONE);

/**
 * Central operacional: saúde dos clientes, rotinas de hoje e planejamento do trabalho
 * (hoje, próximos 7 dias, 30 dias e até o fim do mês).
 */
export async function centralOverview(actor: Actor, now = new Date()) {
  assertCan(actor, "dashboard.view");
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const { y, m } = parseLocalDate(today);
  const monthEnd = makeLocalDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1);
  const tomorrow = addDays(today, 1);
  const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const open = buildTaskWhere(actor, { open: true });

  const [clients, overdueBy, pendBy, done, docs, routines, windows] = await Promise.all([
    prisma.client.findMany({
      where: { ...clientScope(actor), archivedAt: null, status: { in: ["ATIVO", "IMPLANTACAO"] } },
      orderBy: { tradeName: "asc" },
      select: { id: true, tradeName: true, status: true },
    }),
    prisma.task.groupBy({
      by: ["clientId"],
      where: { AND: [open, { dueAt: { lt: startOfToday(now) } }] },
      _count: { _all: true },
    }),
    prisma.pending.groupBy({
      by: ["clientId"],
      where: { organizationId: actor.organizationId, resolvedAt: null, client: clientScope(actor) },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: { AND: [buildTaskWhere(actor, { status: ["CONCLUIDA"] }), { completedAt: { gte: since } }] },
      select: { clientId: true, completedAt: true, dueAt: true },
    }),
    documentsOverview(actor, previousCompetence(today)),
    prisma.task.findMany({
      where: { AND: [buildTaskWhere(actor, {}), { origin: "RECORRENTE", dueAt: { gte: inst(today), lt: inst(tomorrow) }, status: { not: "CANCELADA" } }] },
      select: { id: true, title: true, status: true, dueAt: true, client: { select: { id: true, tradeName: true } } },
      orderBy: { dueAt: "asc" },
      take: 80,
    }),
    Promise.all(
      [
        { key: "today", from: inst(today), to: inst(tomorrow) },
        { key: "week", from: inst(today), to: inst(addDays(today, 7)) },
        { key: "month30", from: inst(today), to: inst(addDays(today, 30)) },
        { key: "eom", from: inst(today), to: inst(monthEnd) },
      ].map(async (w) => {
        const agg = await prisma.task.aggregate({
          where: { AND: [open, { dueAt: { gte: w.from, lt: w.to } }] },
          _count: { _all: true },
          _sum: { estimatedMinutes: true },
        });
        return [w.key, { tasks: agg._count._all, minutes: agg._sum.estimatedMinutes ?? 0 }] as const;
      }),
    ),
  ]);

  const overdueMap = new Map(overdueBy.map((r) => [r.clientId, r._count._all]));
  const pendMap = new Map(pendBy.map((r) => [r.clientId, r._count._all]));
  const docMap = new Map(docs.map((d) => [d.id, d.missing.length]));
  const doneMap = new Map<string, { n: number; ok: number }>();
  for (const d of done) {
    if (!d.clientId) continue;
    const e = doneMap.get(d.clientId) ?? { n: 0, ok: 0 };
    e.n++;
    if (d.completedAt && d.completedAt <= d.dueAt) e.ok++;
    doneMap.set(d.clientId, e);
  }

  const health = clients
    .map((c) => {
      const overdueTasks = overdueMap.get(c.id) ?? 0;
      const openPendings = pendMap.get(c.id) ?? 0;
      const missingDocuments = docMap.get(c.id) ?? 0;
      const d = doneMap.get(c.id) ?? { n: 0, ok: 0 };
      const h = clientHealth({ overdueTasks, openPendings, missingDocuments, doneLast30: d.n, doneOnTimeLast30: d.ok });
      return { id: c.id, name: c.tradeName, status: c.status, overdueTasks, openPendings, missingDocuments, ...h };
    })
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "pt-BR"));

  return {
    today,
    health,
    routines: routines.map((r) => ({ id: r.id, title: r.title, status: r.status, dueAt: r.dueAt, client: r.client })),
    planning: Object.fromEntries(windows) as Record<"today" | "week" | "month30" | "eom", { tasks: number; minutes: number }>,
  };
}
