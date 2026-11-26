import { instantToLocalDate, startOfToday, type LocalDate } from "@/domain/dates";
import { NotFoundError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { buildTaskWhere } from "./tasks";

const dbDay = (d: LocalDate) => new Date(`${d}T00:00:00Z`);
export const todayLocal = (now = new Date()) => instantToLocalDate(now, APP_TIMEZONE);

export async function dayGoal(actor: Actor, now = new Date()) {
  const date = todayLocal(now);
  const rows = await prisma.dayGoalTask.findMany({ where: { userId: actor.userId, date: dbDay(date) } });
  const ids = rows.map((r) => r.taskId);
  const goalTasks = ids.length
    ? await prisma.task.findMany({
        where: { AND: [buildTaskWhere(actor, {}), { id: { in: ids } }] },
        select: { id: true, title: true, status: true, dueAt: true, client: { select: { tradeName: true } } },
        orderBy: { dueAt: "asc" },
      })
    : [];
  const items = goalTasks.map((t) => ({ id: t.id, title: t.title, client: t.client?.tradeName ?? null, done: t.status === "CONCLUIDA", cancelled: t.status === "CANCELADA", dueAt: t.dueAt })).filter((t) => !t.cancelled);
  const candidates = await prisma.task.findMany({
    where: { AND: [buildTaskWhere(actor, { assigneeId: actor.userId }), { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: new Date(startOfToday(now).getTime() + 86400000) } }, { id: { notIn: ids } }] },
    select: { id: true, title: true, client: { select: { tradeName: true } }, dueAt: true },
    orderBy: { dueAt: "asc" },
    take: 40,
  });
  return { date, items, done: items.filter((i) => i.done).length, candidates: candidates.map((c) => ({ id: c.id, title: c.title, client: c.client?.tradeName ?? null })) };
}

export async function addToDayGoal(actor: Actor, taskId: string, now = new Date()) {
  const ok = await prisma.task.count({ where: { AND: [buildTaskWhere(actor, {}), { id: taskId }] } });
  if (!ok) throw new NotFoundError("Tarefa não encontrada");
  const date = dbDay(todayLocal(now));
  await prisma.dayGoalTask.upsert({
    where: { userId_date_taskId: { userId: actor.userId, date, taskId } },
    create: { userId: actor.userId, organizationId: actor.organizationId, date, taskId },
    update: {},
  });
}

export async function removeFromDayGoal(actor: Actor, taskId: string, now = new Date()) {
  await prisma.dayGoalTask.deleteMany({ where: { userId: actor.userId, date: dbDay(todayLocal(now)), taskId } });
}
