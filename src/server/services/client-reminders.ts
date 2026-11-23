import { NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { createTask } from "./tasks";

/** Lembretes rápidos do cliente. Quem tem acesso ao cliente lê e escreve. */
export async function listReminders(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.clientReminder.findMany({
    where: { organizationId: actor.organizationId, clientId },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { author: { select: { name: true } } },
  });
}

async function own(actor: Actor, id: string) {
  const row = await prisma.clientReminder.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!row) throw new NotFoundError("Lembrete não encontrado.");
  await assertClientAccess(actor, row.clientId);
  return row;
}

export async function addReminder(actor: Actor, clientId: string, text: string) {
  await assertClientAccess(actor, clientId);
  const clean = text.trim();
  if (!clean) throw new ValidationError("Escreva o lembrete.");
  if (clean.length > 500) throw new ValidationError("O lembrete pode ter até 500 caracteres.");
  return prisma.clientReminder.create({ data: { organizationId: actor.organizationId, clientId, text: clean, authorId: actor.userId } });
}

export async function setReminderDone(actor: Actor, id: string, done: boolean) {
  await own(actor, id);
  await prisma.clientReminder.update({ where: { id }, data: { done, doneAt: done ? new Date() : null } });
}

export async function deleteReminder(actor: Actor, id: string) {
  await own(actor, id);
  await prisma.clientReminder.delete({ where: { id } });
}

/** Cria uma tarefa do cliente a partir do lembrete e marca o lembrete como feito. */
export async function reminderToTask(actor: Actor, id: string, dueDate: string) {
  const r = await own(actor, id);
  if (r.taskId) throw new ValidationError("Este lembrete já virou tarefa.");
  const task = await createTask(actor, {
    clientId: r.clientId,
    title: r.text.length > 140 ? `${r.text.slice(0, 137)}…` : r.text,
    description: r.text.length > 140 ? r.text : undefined,
    category: "OUTRAS",
    priority: "NORMAL",
    dueDate,
    dueTime: "18:00",
    assigneeId: actor.userId,
    checklist: [],
  });
  await prisma.clientReminder.update({ where: { id }, data: { taskId: task.id, done: true, doneAt: new Date() } });
  return task;
}
