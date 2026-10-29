import type { Prisma, TaskStatus as DbTaskStatus } from "@prisma/client";
import { instantToLocalDate, localDateTimeToInstant, localDateToDbDate } from "@/domain/dates";
import type { Priority, TaskCategory, TaskStatus } from "@/domain/enums";
import { CLOSED_STATUSES, STATUS_LABEL } from "@/domain/enums";
import { ForbiddenError, NotFoundError, ValidationError, can, type Actor } from "@/domain/permissions";
import { ACTION_LABEL, checkTransition, type TaskAction, type TaskSnapshot } from "@/domain/task-rules";
import { APP_TIMEZONE, PAGE_SIZE } from "../config";
import { prisma } from "../db";
import { parseInput, taskCreateSchema, taskUpdateSchema, urlSchema } from "../validation";
import { assertClientAccess, assertTaskAccess, assertUserInOrg, taskScope } from "./access";
import { diffFields, recordAudit } from "./audit";

export interface TaskFilters {
  q?: string;
  clientId?: string;
  assigneeId?: string;
  reviewerId?: string;
  status?: TaskStatus[];
  category?: TaskCategory;
  priority?: Priority;
  overdue?: boolean;
  /** Apenas tarefas abertas (não concluídas/canceladas) */
  open?: boolean;
  dueFrom?: Date;
  dueTo?: Date;
  origin?: "MANUAL" | "RECORRENTE";
  sort?: "due" | "priority" | "created" | "completed";
  page?: number;
  pageSize?: number;
}

export function buildTaskWhere(actor: Actor, f: TaskFilters, now = new Date()): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [taskScope(actor), { archivedAt: null }];
  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
        { client: { tradeName: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }
  if (f.clientId) and.push({ clientId: f.clientId });
  if (f.assigneeId) and.push({ assigneeId: f.assigneeId === "none" ? null : f.assigneeId });
  if (f.reviewerId) and.push({ reviewerId: f.reviewerId });
  if (f.status?.length) and.push({ status: { in: f.status as DbTaskStatus[] } });
  if (f.open) and.push({ status: { notIn: ["CONCLUIDA", "CANCELADA"] } });
  if (f.category) and.push({ category: f.category });
  if (f.priority) and.push({ priority: f.priority });
  if (f.origin) and.push({ origin: f.origin });
  if (f.overdue) and.push({ status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: now } });
  if (f.dueFrom || f.dueTo) and.push({ dueAt: { ...(f.dueFrom ? { gte: f.dueFrom } : {}), ...(f.dueTo ? { lt: f.dueTo } : {}) } });
  return { AND: and };
}

export const taskListInclude = {
  client: { select: { id: true, tradeName: true } },
  assignee: { select: { id: true, name: true } },
  reviewer: { select: { id: true, name: true } },
  _count: { select: { checklistItems: true } },
  checklistItems: { select: { done: true, required: true } },
} satisfies Prisma.TaskInclude;

export type TaskListRow = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;

function orderFor(sort: TaskFilters["sort"]): Prisma.TaskOrderByWithRelationInput[] {
  if (sort === "priority") return [{ priority: "desc" }, { dueAt: "asc" }];
  if (sort === "created") return [{ createdAt: "desc" }];
  if (sort === "completed") return [{ completedAt: { sort: "desc", nulls: "last" } }];
  return [{ dueAt: "asc" }, { priority: "desc" }];
}

export async function listTasks(actor: Actor, filters: TaskFilters = {}) {
  const pageSize = Math.min(filters.pageSize ?? PAGE_SIZE, 500);
  const page = Math.max(1, filters.page ?? 1);
  const where = buildTaskWhere(actor, filters);
  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: taskListInclude,
      orderBy: orderFor(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, rows };
}

export async function getTaskDetail(actor: Actor, taskId: string) {
  await assertTaskAccess(actor, taskId);
  return prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      client: { select: { id: true, tradeName: true, legalName: true } },
      assignee: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      executedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      completedBy: { select: { name: true } },
      recurrence: { select: { id: true, template: { select: { name: true } } } },
      checklistItems: { orderBy: { position: "asc" }, include: { doneBy: { select: { name: true } } } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      evidences: { orderBy: { createdAt: "asc" }, include: { addedBy: { select: { name: true } } } },
      pendings: {
        orderBy: { requestedAt: "desc" },
        include: { createdBy: { select: { name: true } }, resolvedBy: { select: { name: true } } },
      },
      auditEvents: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
}

function isManager(actor: Actor) {
  return can(actor, "tasks.plan");
}

/** Pode alterar conteúdo de trabalho (checklist, evidências) da tarefa. */
function canWorkOn(actor: Actor, task: { assigneeId: string | null; reviewerId: string | null }) {
  return isManager(actor) || task.assigneeId === actor.userId || task.reviewerId === actor.userId;
}

function assertOpen(task: { status: DbTaskStatus }) {
  if (CLOSED_STATUSES.includes(task.status as TaskStatus)) {
    throw new ValidationError("Tarefa concluída ou cancelada. Reabra a tarefa para alterá-la.");
  }
}

function timing(input: { dueDate: string; dueTime: string; startDate?: string; startTime?: string }) {
  const dueAt = localDateTimeToInstant(input.dueDate, input.dueTime, APP_TIMEZONE);
  const startAt = input.startDate
    ? localDateTimeToInstant(input.startDate, input.startTime ?? "08:00", APP_TIMEZONE)
    : null;
  if (startAt && startAt > dueAt) {
    throw new ValidationError("O início deve ser anterior ao prazo.", { startDate: "Início após o prazo." });
  }
  return { dueAt, startAt };
}

async function validatePeople(actor: Actor, clientId: string, assigneeId?: string, reviewerId?: string) {
  if (assigneeId) await assertUserInOrg(actor.organizationId, assigneeId, clientId);
  if (reviewerId) await assertUserInOrg(actor.organizationId, reviewerId, clientId);
  if (assigneeId && reviewerId && assigneeId === reviewerId) {
    throw new ValidationError("O revisor deve ser diferente do responsável.", { reviewerId: "Escolha outro revisor." });
  }
}

export async function createTask(actor: Actor, raw: unknown) {
  if (!can(actor, "tasks.create")) throw new ForbiddenError();
  const input = parseInput(taskCreateSchema, raw);
  await assertClientAccess(actor, input.clientId);
  let assigneeId = input.assigneeId;
  if (!isManager(actor)) {
    // Operadores criam tarefas apenas para si mesmos.
    if (assigneeId && assigneeId !== actor.userId) throw new ForbiddenError("Operadores só podem criar tarefas para si.");
    assigneeId = actor.userId;
  }
  await validatePeople(actor, input.clientId, assigneeId, input.reviewerId);
  const { dueAt, startAt } = timing(input);

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        organizationId: actor.organizationId,
        clientId: input.clientId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        priority: input.priority,
        competence: input.competence ?? null,
        dueAt,
        startAt,
        estimatedMinutes: input.estimatedMinutes ?? null,
        requiresEvidence: input.requiresEvidence,
        assigneeId: assigneeId ?? null,
        reviewerId: input.reviewerId ?? null,
        createdById: actor.userId,
        origin: "MANUAL",
        checklistItems: {
          create: input.checklist.map((item, position) => ({ label: item.label, required: item.required, position })),
        },
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: task.id,
      taskId: task.id,
      clientId: task.clientId,
      action: "task.created",
      summary: `Tarefa criada manualmente`,
    });
    return task;
  });
}

const UPDATE_FIELDS = [
  "title",
  "description",
  "category",
  "priority",
  "competence",
  "dueAt",
  "startAt",
  "estimatedMinutes",
  "requiresEvidence",
  "assigneeId",
  "reviewerId",
] as const;
const OPERATOR_EDITABLE = new Set(["title", "description", "estimatedMinutes", "competence"]);

export async function updateTask(actor: Actor, taskId: string, raw: unknown) {
  const before = await assertTaskAccess(actor, taskId);
  assertOpen(before);
  if (!canWorkOn(actor, before)) throw new ForbiddenError("Você não pode editar esta tarefa.");
  const input = parseInput(taskUpdateSchema, raw);
  const { dueAt, startAt } = timing(input);
  const data = {
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    priority: input.priority,
    competence: input.competence ?? null,
    dueAt,
    startAt,
    estimatedMinutes: input.estimatedMinutes ?? null,
    requiresEvidence: input.requiresEvidence,
    assigneeId: input.assigneeId ?? null,
    reviewerId: input.reviewerId ?? null,
  };
  const changes = diffFields(before as unknown as Record<string, unknown>, data, UPDATE_FIELDS);
  if (Object.keys(changes).length === 0) return before;
  if (!isManager(actor)) {
    const forbidden = Object.keys(changes).filter((k) => !OPERATOR_EDITABLE.has(k));
    if (forbidden.length) {
      throw new ForbiddenError("Apenas gestores podem alterar responsável, revisor, prazo, prioridade ou exigências.");
    }
  }
  if (changes.assigneeId || changes.reviewerId) {
    await validatePeople(actor, before.clientId, data.assigneeId ?? undefined, data.reviewerId ?? undefined);
  }
  if (before.status === "EM_REVISAO" && changes.reviewerId && !data.reviewerId) {
    throw new ValidationError("A tarefa está em revisão: devolva-a antes de remover o revisor.");
  }
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({ where: { id: taskId }, data });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: taskId,
      taskId,
      clientId: before.clientId,
      action: "task.updated",
      summary: `Tarefa alterada (${Object.keys(changes).join(", ")})`,
      changes: changes as Prisma.InputJsonValue,
    });
    return task;
  });
}

async function snapshot(taskId: string): Promise<TaskSnapshot & { clientId: string; organizationId: string }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { checklistItems: { select: { required: true, done: true } }, _count: { select: { evidences: true } } },
  });
  if (!task) throw new NotFoundError();
  return {
    status: task.status as TaskStatus,
    assigneeId: task.assigneeId,
    reviewerId: task.reviewerId,
    requiresEvidence: task.requiresEvidence,
    checklist: task.checklistItems,
    evidenceCount: task._count.evidences,
    clientId: task.clientId,
    organizationId: task.organizationId,
  };
}

export interface TransitionRequest {
  note?: string | null;
  followUpDate?: string | null;
  respondent?: string | null;
}

/**
 * Único ponto de mudança de status. Botões, formulários e o Kanban chamam
 * esta função, que aplica as validações do domínio e registra a auditoria.
 */
export async function transitionTask(actor: Actor, taskId: string, action: TaskAction, req: TransitionRequest = {}) {
  await assertTaskAccess(actor, taskId);
  const snap = await snapshot(taskId);
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const check = checkTransition(snap, action, actor, { note: req.note, followUpDate: req.followUpDate, today });
  if (!check.ok) throw new ValidationError(check.error);
  const note = req.note?.trim() || null;

  const data: Prisma.TaskUncheckedUpdateInput = { status: check.to };
  switch (action) {
    case "START":
      if (!snap.assigneeId) data.assigneeId = actor.userId;
      break;
    case "SUBMIT_REVIEW":
      data.executedById = actor.userId;
      data.executedAt = now;
      break;
    case "COMPLETE":
      data.executedById = actor.userId;
      data.executedAt = now;
      data.completedById = actor.userId;
      data.completedAt = now;
      break;
    case "APPROVE":
      data.reviewedById = actor.userId;
      data.reviewedAt = now;
      data.completedById = actor.userId;
      data.completedAt = now;
      break;
    case "RETURN":
      data.returnCount = { increment: 1 };
      data.lastReturnReason = note;
      break;
    case "REOPEN":
      data.completedAt = null;
      data.completedById = null;
      data.reviewedAt = null;
      data.reviewedById = null;
      break;
  }

  return prisma.$transaction(async (tx) => {
    // Atualização condicional: evita sobrescrever uma mudança concorrente.
    const updated = await tx.task.updateMany({ where: { id: taskId, status: snap.status as DbTaskStatus }, data });
    if (updated.count === 0) throw new ValidationError("A tarefa foi alterada por outra pessoa. Recarregue a página.");

    // Pendências externas
    const openPendings = await tx.pending.findMany({ where: { taskId, resolvedAt: null } });
    const closesPendings = action === "RESUME" || action === "CANCEL" || action === "WAIT_CLIENT" || action === "WAIT_THIRD";
    if (closesPendings && openPendings.length) {
      await tx.pending.updateMany({
        where: { taskId, resolvedAt: null },
        data: {
          resolvedAt: now,
          resolvedById: actor.userId,
          resolution:
            action === "RESUME" ? note ?? "Retomada" : action === "CANCEL" ? "Tarefa cancelada" : "Substituída por nova pendência",
        },
      });
    }
    if (action === "WAIT_CLIENT" || action === "WAIT_THIRD") {
      await tx.pending.create({
        data: {
          organizationId: snap.organizationId,
          clientId: snap.clientId,
          taskId,
          type: action === "WAIT_CLIENT" ? "CLIENTE" : "TERCEIRO",
          reason: note!,
          respondent: req.respondent?.trim() || null,
          followUpAt: localDateToDbDate(req.followUpDate!),
          createdById: actor.userId,
        },
      });
    }
    if (note && (action === "RETURN" || action === "REOPEN" || action === "CANCEL")) {
      await tx.comment.create({
        data: { taskId, authorId: actor.userId, body: `${ACTION_LABEL[action]}: ${note}` },
      });
    }
    await recordAudit(tx, {
      organizationId: snap.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: taskId,
      taskId,
      clientId: snap.clientId,
      action: `task.${action.toLowerCase()}`,
      summary: `${ACTION_LABEL[action]}: ${STATUS_LABEL[snap.status]} → ${STATUS_LABEL[check.to]}${note ? ` — ${note}` : ""}`,
      changes: {
        status: { de: snap.status, para: check.to },
        ...(note ? { nota: note } : {}),
        ...(req.followUpDate ? { acompanhamento: req.followUpDate } : {}),
      },
    });
    return { status: check.to };
  });
}

// ---------------------------------------------------------------------------
// Checklist, comentários e evidências
// ---------------------------------------------------------------------------

async function loadWorkable(actor: Actor, taskId: string) {
  const task = await assertTaskAccess(actor, taskId);
  assertOpen(task);
  if (!canWorkOn(actor, task)) throw new ForbiddenError("Você não pode alterar esta tarefa.");
  return task;
}

export async function addChecklistItem(actor: Actor, taskId: string, label: string, required: boolean) {
  const task = await loadWorkable(actor, taskId);
  const text = label.trim();
  if (text.length < 1 || text.length > 300) throw new ValidationError("Informe o item do checklist.");
  if (required && !isManager(actor)) throw new ForbiddenError("Apenas gestores podem incluir itens obrigatórios.");
  const max = await prisma.checklistItem.aggregate({ where: { taskId }, _max: { position: true } });
  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.create({ data: { taskId, label: text, required, position: (max._max.position ?? -1) + 1 } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: taskId,
      taskId,
      clientId: task.clientId,
      action: "checklist.added",
      summary: `Item de checklist incluído: "${text}"${required ? " (obrigatório)" : ""}`,
    });
  });
}

export async function toggleChecklistItem(actor: Actor, itemId: string, done: boolean) {
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError();
  const task = await loadWorkable(actor, item.taskId);
  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.update({
      where: { id: itemId },
      data: { done, doneById: done ? actor.userId : null, doneAt: done ? new Date() : null },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: task.id,
      taskId: task.id,
      clientId: task.clientId,
      action: done ? "checklist.checked" : "checklist.unchecked",
      summary: `${done ? "Marcou" : "Desmarcou"} "${item.label}"`,
    });
  });
}

export async function removeChecklistItem(actor: Actor, itemId: string) {
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError();
  const task = await loadWorkable(actor, item.taskId);
  if (item.required && !isManager(actor)) throw new ForbiddenError("Apenas gestores podem remover itens obrigatórios.");
  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.delete({ where: { id: itemId } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: task.id,
      taskId: task.id,
      clientId: task.clientId,
      action: "checklist.removed",
      summary: `Item de checklist removido: "${item.label}"`,
    });
  });
}

export async function addComment(actor: Actor, taskId: string, body: string) {
  await assertTaskAccess(actor, taskId);
  const text = body.trim();
  if (text.length < 1) throw new ValidationError("Escreva um comentário.");
  if (text.length > 5000) throw new ValidationError("Comentário muito longo (máx. 5000 caracteres).");
  return prisma.comment.create({ data: { taskId, authorId: actor.userId, body: text } });
}

export async function addEvidence(actor: Actor, taskId: string, url: string, description?: string) {
  const task = await loadWorkable(actor, taskId);
  const parsed = parseInput(urlSchema, url);
  await prisma.$transaction(async (tx) => {
    await tx.evidence.create({
      data: { taskId, url: parsed, description: description?.trim() || null, addedById: actor.userId },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: taskId,
      taskId,
      clientId: task.clientId,
      action: "evidence.added",
      summary: `Evidência adicionada: ${parsed}`,
    });
  });
}

export async function removeEvidence(actor: Actor, evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } });
  if (!evidence) throw new NotFoundError();
  const task = await loadWorkable(actor, evidence.taskId);
  if (evidence.addedById !== actor.userId && !isManager(actor)) {
    throw new ForbiddenError("Apenas quem adicionou a evidência ou um gestor pode removê-la.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.evidence.delete({ where: { id: evidenceId } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Task",
      entityId: task.id,
      taskId: task.id,
      clientId: task.clientId,
      action: "evidence.removed",
      summary: `Evidência removida: ${evidence.url}`,
    });
  });
}

/** Usuários que podem ser responsáveis/revisores de tarefas de um cliente. */
export async function assignableUsers(actor: Actor, clientId?: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: actor.organizationId,
      active: true,
      user: { active: true },
      ...(clientId ? { OR: [{ role: "ADMIN" }, { user: { clientMemberships: { some: { clientId } } } }] } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role }));
}

/** Pessoas da empresa com os clientes a que estão vinculadas (para formulários). */
export async function peopleWithClients(actor: Actor) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: actor.organizationId, active: true, user: { active: true } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          clientMemberships: { where: { client: { organizationId: actor.organizationId } }, select: { clientId: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    role: m.role,
    clientIds: m.role === "ADMIN" ? null : m.user.clientMemberships.map((c) => c.clientId),
  }));
}
