import type { Prisma } from "@prisma/client";
import { localDateToDbDate } from "@/domain/dates";
import { ForbiddenError, NotFoundError, ValidationError, can, type Actor } from "@/domain/permissions";
import { PAGE_SIZE } from "../config";
import { prisma } from "../db";
import { localDate, parseInput } from "../validation";
import { assertTaskAccess, taskScope } from "./access";
import { createTask, transitionTask } from "./tasks";
import { recordAudit } from "./audit";

export interface PendingFilters {
  clientId?: string;
  type?: "CLIENTE" | "TERCEIRO";
  mine?: boolean;
  followUpUntil?: Date;
  page?: number;
}

export async function listPendings(actor: Actor, f: PendingFilters = {}) {
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.PendingWhereInput = {
    organizationId: actor.organizationId,
    resolvedAt: null,
    task: {
      ...taskScope(actor),
      ...(f.mine ? { assigneeId: actor.userId } : {}),
    },
    ...(f.clientId ? { clientId: f.clientId } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.followUpUntil ? { followUpAt: { lte: f.followUpUntil } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.pending.count({ where }),
    prisma.pending.findMany({
      where,
      orderBy: [{ followUpAt: "asc" }, { requestedAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, tradeName: true } },
        task: { select: { id: true, title: true, status: true, dueAt: true, assignee: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);
  return { total, page, pageSize: PAGE_SIZE, rows };
}

/** Atualiza o próximo acompanhamento e quem precisa responder. */
export async function updatePendingFollowUp(
  actor: Actor,
  pendingId: string,
  input: { followUpDate: string; respondent?: string | null; note?: string | null },
) {
  const pending = await prisma.pending.findFirst({ where: { id: pendingId, organizationId: actor.organizationId } });
  if (!pending) throw new NotFoundError();
  const task = await assertTaskAccess(actor, pending.taskId);
  if (!can(actor, "tasks.plan") && task.assigneeId !== actor.userId) {
    throw new ForbiddenError("Apenas o responsável ou um gestor pode atualizar a pendência.");
  }
  if (pending.resolvedAt) throw new ValidationError("Pendência já resolvida.");
  const date = parseInput(localDate, input.followUpDate);
  await prisma.$transaction(async (tx) => {
    await tx.pending.update({
      where: { id: pendingId },
      data: { followUpAt: localDateToDbDate(date), respondent: input.respondent?.trim() || pending.respondent },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: task.id,
      taskId: task.id,
      clientId: task.clientId,
      action: "pending.followup",
      summary: `Acompanhamento da pendência reagendado para ${date.split("-").reverse().join("/")}${
        input.note?.trim() ? ` — ${input.note.trim()}` : ""
      }`,
    });
  });
}

/** Nova pendência avulsa: cria a tarefa e já a coloca em espera do cliente (a pendência nasce junto). */
export async function createManualPending(actor: Actor, raw: Record<string, unknown>) {
  const description = String(raw.description ?? "").trim();
  const clientId = String(raw.clientId ?? "");
  if (description.length < 2) throw new ValidationError("Descreva a pendência.", { description: "Descreva a pendência." });
  if (!clientId) throw new ValidationError("Selecione o cliente.", { clientId: "Selecione o cliente." });
  const followUpDate = parseInput(localDate, raw.followUpDate);
  const task = await createTask(actor, {
    clientId,
    title: description,
    description: String(raw.notes ?? "") || undefined,
    category: "OUTRAS",
    priority: raw.priority || "NORMAL",
    dueDate: followUpDate,
    dueTime: "18:00",
  });
  await transitionTask(actor, task.id, "WAIT_CLIENT", { note: description, followUpDate, respondent: String(raw.respondent ?? "") || null });
  return task;
}
