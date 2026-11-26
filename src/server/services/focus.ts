import { addDays, instantToLocalDate, type LocalDate } from "@/domain/dates";
import type { Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { buildTaskWhere } from "./tasks";

export async function recordFocus(actor: Actor, input: { taskId: string | null; startedAt: number; seconds: number; plannedMinutes: number; completed: boolean; tiny: boolean }) {
  const seconds = Math.round(input.seconds);
  if (!Number.isFinite(seconds) || seconds < 60 || seconds > 4 * 3600) return;
  let clientId: string | null = null;
  let taskId: string | null = null;
  if (input.taskId) {
    const t = await prisma.task.findFirst({ where: { AND: [buildTaskWhere(actor, {}), { id: input.taskId }] }, select: { id: true, clientId: true } });
    if (t) {
      taskId = t.id;
      clientId = t.clientId;
    }
  }
  await prisma.focusSession.create({
    data: { organizationId: actor.organizationId, userId: actor.userId, taskId, clientId, startedAt: new Date(input.startedAt), seconds, plannedMinutes: Math.max(1, Math.round(input.plannedMinutes)), completed: input.completed, tiny: input.tiny },
  });
}

export async function focusStats(actor: Actor, now = new Date()) {
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const since = new Date(now.getTime() - 35 * 86400000);
  const rows = await prisma.focusSession.findMany({ where: { userId: actor.userId, startedAt: { gte: since } }, orderBy: { startedAt: "asc" } });
  const dayOf = (d: Date) => instantToLocalDate(d, APP_TIMEZONE);
  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", hour12: false }).format(d)) % 24;
  const byDay = new Map<LocalDate, { min: number; n: number }>();
  for (const r of rows) {
    const k = dayOf(r.startedAt);
    const cur = byDay.get(k) ?? { min: 0, n: 0 };
    byDay.set(k, { min: cur.min + r.seconds / 60, n: cur.n + (r.completed ? 1 : 0) });
  }
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ date: d, min: Math.round(byDay.get(d)?.min ?? 0), n: byDay.get(d)?.n ?? 0 }));
  const sum = (from: LocalDate) => rows.filter((r) => dayOf(r.startedAt) >= from).reduce((a, r) => ({ min: a.min + r.seconds / 60, n: a.n + (r.completed ? 1 : 0), all: a.all + 1 }), { min: 0, n: 0, all: 0 });
  const t = sum(today);
  const w = sum(addDays(today, -6));
  const m = sum(addDays(today, -29));
  let streak = 0;
  for (let i = byDay.has(today) ? 0 : 1; ; i++) {
    const d = addDays(today, -i);
    if ((byDay.get(d)?.n ?? 0) > 0) streak++;
    else break;
  }
  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of rows) hours[hourOf(r.startedAt)] += r.seconds / 60;
  const month = rows.filter((r) => dayOf(r.startedAt) >= addDays(today, -29));
  const tally = <K extends string>(key: (r: (typeof rows)[number]) => K | null) => {
    const mp = new Map<K, number>();
    for (const r of month) {
      const k = key(r);
      if (k) mp.set(k, (mp.get(k) ?? 0) + r.seconds / 60);
    }
    return [...mp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const clientTop = tally((r) => r.clientId);
  const taskTop = tally((r) => r.taskId);
  const [clients, tasks] = await Promise.all([
    prisma.client.findMany({ where: { id: { in: clientTop.map(([id]) => id) } }, select: { id: true, tradeName: true } }),
    prisma.task.findMany({ where: { id: { in: taskTop.map(([id]) => id) } }, select: { id: true, title: true } }),
  ]);
  return {
    today: { min: Math.round(t.min), n: t.n },
    week: { min: Math.round(w.min), n: w.n },
    month: { min: Math.round(m.min), n: m.n, rate: m.all ? Math.round((m.n / m.all) * 100) : 0, avg: m.n ? Math.round(m.min / m.all) : 0 },
    streak,
    days,
    hours: hours.map((h) => Math.round(h)),
    byClient: clientTop.map(([id, min]) => ({ id, name: clients.find((c) => c.id === id)?.tradeName ?? "—", min: Math.round(min) })),
    byTask: taskTop.map(([id, min]) => ({ id, name: tasks.find((c) => c.id === id)?.title ?? "—", min: Math.round(min) })),
    total: rows.length,
  };
}
