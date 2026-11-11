import type { Prisma } from "@prisma/client";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { CLOSED_STATUSES, type TaskStatus } from "@/domain/enums";
import { ForbiddenError, ValidationError, can, type Actor } from "@/domain/permissions";
import { availableActions } from "@/domain/task-rules";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { assertTaskAccess } from "./access";
import { recordAudit } from "./audit";
import { taskSnapshot, transitionTask } from "./tasks";

type Tx = Prisma.TransactionClient;

/** Menor duração que vale registrar (segundos). */
const MIN_SECONDS = 5;

/** Fecha um cronômetro em andamento, gravando o tempo como apontamento da tarefa. */
async function closeTimer(tx: Tx, timer: { id: string; organizationId: string; userId: string; taskId: string; startedAt: Date }, now: Date) {
  const seconds = Math.max(0, Math.floor((now.getTime() - timer.startedAt.getTime()) / 1000));
  await tx.runningTimer.delete({ where: { id: timer.id } });
  if (seconds < MIN_SECONDS) return null;
  const task = await tx.task.findUniqueOrThrow({ where: { id: timer.taskId }, select: { clientId: true } });
  const entry = await tx.timeEntry.create({
    data: {
      organizationId: timer.organizationId,
      clientId: task.clientId,
      taskId: timer.taskId,
      userId: timer.userId,
      workedOn: localDateToDbDate(instantToLocalDate(timer.startedAt, APP_TIMEZONE)),
      minutes: Math.max(1, Math.round(seconds / 60)),
      seconds,
      note: "Cronômetro",
    },
  });
  await recordAudit(tx, {
    organizationId: timer.organizationId,
    actorId: timer.userId,
    entityType: "TimeEntry",
    entityId: entry.id,
    taskId: timer.taskId,
    clientId: task.clientId,
    action: "time.timer",
    summary: `Cronômetro registrou ${Math.floor(seconds / 60)} min ${seconds % 60} s`,
  });
  return entry;
}

/** Usado ao excluir a tarefa: encerra e grava o tempo de quem estava cronometrando. */
export async function stopTimersOfTask(tx: Tx, taskId: string) {
  const timers = await tx.runningTimer.findMany({ where: { taskId } });
  const now = new Date();
  for (const t of timers) await closeTimer(tx, t, now);
}

export async function getRunningTimer(actor: Actor) {
  const t = await prisma.runningTimer.findUnique({
    where: { userId: actor.userId },
    include: { task: { select: { id: true, title: true, client: { select: { tradeName: true } } } } },
  });
  if (!t) return null;
  return { taskId: t.taskId, taskTitle: t.task.title, clientName: t.task.client.tradeName, startedAt: t.startedAt.toISOString() };
}

/** Tempo total já apontado na tarefa (todas as pessoas), em segundos. */
export async function taskTrackedSeconds(taskId: string) {
  const rows = await prisma.timeEntry.findMany({ where: { taskId }, select: { minutes: true, seconds: true } });
  return rows.reduce((a, r) => a + (r.seconds ?? r.minutes * 60), 0);
}

function canTime(actor: Actor, t: { assigneeId: string | null; reviewerId: string | null; status: string }) {
  return can(actor, "tasks.plan") || t.assigneeId === actor.userId || t.reviewerId === actor.userId || (t.assigneeId === null && t.status === "A_FAZER");
}

export async function startTimer(actor: Actor, taskId: string) {
  const task = await assertTaskAccess(actor, taskId);
  const status = task.status as TaskStatus;
  if (CLOSED_STATUSES.includes(status)) throw new ValidationError("Tarefa concluída ou cancelada. Reabra a tarefa para cronometrar.");
  if (status === "AGUARDANDO_CLIENTE" || status === "AGUARDANDO_TERCEIRO") {
    throw new ValidationError("A tarefa está aguardando retorno. Retome a tarefa antes de iniciar o cronômetro.");
  }
  if (!canTime(actor, task)) throw new ForbiddenError("Você não pode cronometrar esta tarefa.");

  const current = await prisma.runningTimer.findUnique({ where: { userId: actor.userId } });
  if (current?.taskId === taskId) return; // já está rodando

  // Tarefa "A fazer" passa a "Em andamento" ao iniciar (e assume o responsável, se não houver).
  if (status === "A_FAZER") await transitionTask(actor, taskId, "START");

  await prisma.$transaction(async (tx) => {
    const running = await tx.runningTimer.findUnique({ where: { userId: actor.userId } });
    const now = new Date();
    if (running) await closeTimer(tx, running, now); // um cronômetro por pessoa
    await tx.runningTimer.create({ data: { organizationId: actor.organizationId, userId: actor.userId, taskId, startedAt: now } });
  });
}

export async function pauseTimer(actor: Actor, taskId?: string) {
  const running = await prisma.runningTimer.findUnique({ where: { userId: actor.userId } });
  if (!running || (taskId && running.taskId !== taskId)) throw new ValidationError("Não há cronômetro em andamento nesta tarefa.");
  await assertTaskAccess(actor, running.taskId);
  await prisma.$transaction((tx) => closeTimer(tx, running, new Date()));
}

/** Pausa o cronômetro (se houver) e conclui a tarefa: concluir direto, aprovar ou enviar para revisão. */
export async function finishTask(actor: Actor, taskId: string) {
  await assertTaskAccess(actor, taskId);
  const snap = await taskSnapshot(taskId);
  const actions = availableActions(snap, actor);
  const action = (["COMPLETE", "APPROVE", "SUBMIT_REVIEW"] as const).find((a) => actions.includes(a));
  if (!action) throw new ValidationError("Você não pode concluir esta tarefa no momento.");
  const result = await transitionTask(actor, taskId, action); // valida checklist/evidências antes de mexer no cronômetro
  await prisma.$transaction((tx) => stopTimersOfTask(tx, taskId)); // grava o tempo de quem ainda cronometrava
  return result;
}
