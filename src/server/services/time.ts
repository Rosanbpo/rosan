import { instantToLocalDate, localDateToDbDate, dbDateToLocalDate } from "@/domain/dates";
import { can, ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { APP_TIMEZONE } from "../config";
import { parseInput, timeEntrySchema } from "../validation";
import { assertClientAccess, assertTaskAccess } from "./access";
import { recordAudit } from "./audit";

/** Registra horas trabalhadas pelo próprio usuário, em uma tarefa ou diretamente em um cliente. */
export async function logTime(actor: Actor, raw: unknown) {
  const input = parseInput(timeEntrySchema, raw);
  let clientId = input.clientId;
  if (input.taskId) {
    const task = await assertTaskAccess(actor, input.taskId);
    clientId = task.clientId;
  } else {
    if (!clientId) throw new ValidationError("Selecione o cliente ou a tarefa.", { clientId: "Selecione o cliente." });
    await assertClientAccess(actor, clientId);
  }
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  if (input.workedOn > today) throw new ValidationError("Não é possível apontar horas em data futura.", { workedOn: "Data futura." });

  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.create({
      data: {
        organizationId: actor.organizationId,
        clientId: clientId!,
        taskId: input.taskId ?? null,
        userId: actor.userId,
        workedOn: localDateToDbDate(input.workedOn),
        minutes: input.minutes,
        note: input.note ?? null,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "TimeEntry",
      entityId: entry.id,
      taskId: input.taskId ?? null,
      clientId: clientId!,
      action: "time.logged",
      summary: `${input.minutes} min apontados`,
    });
    return entry;
  });
}

export async function deleteTimeEntry(actor: Actor, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!entry) throw new NotFoundError("Lançamento não encontrado.");
  if (entry.userId !== actor.userId && !can(actor, "tasks.plan")) throw new ForbiddenError();
  // Garante que o usuário ainda tem acesso ao cliente do lançamento.
  await assertClientAccess(actor, entry.clientId);
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.delete({ where: { id } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "TimeEntry",
      entityId: id,
      taskId: entry.taskId,
      clientId: entry.clientId,
      action: "time.deleted",
      summary: `Apontamento de ${entry.minutes} min removido`,
    });
  });
}

export async function listTaskTime(actor: Actor, taskId: string) {
  await assertTaskAccess(actor, taskId);
  const rows = await prisma.timeEntry.findMany({
    where: { taskId },
    include: { user: { select: { name: true } } },
    orderBy: [{ workedOn: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    workedOn: dbDateToLocalDate(r.workedOn),
    minutes: r.minutes,
    note: r.note,
  }));
}
