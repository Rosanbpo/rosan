import type { Prisma } from "@prisma/client";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { TASK_CATEGORIES, type Frequency, type TaskCategory } from "@/domain/enums";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { parseInput, recurrenceSchema, type RecurrenceInput } from "../validation";
import { assertClientAccess, assertUserInOrg, clientScope } from "./access";
import { diffFields, recordAudit } from "./audit";
import { generateForRecurrence, generationBlocker, loadHolidaySet, previewNext, recurrenceInclude } from "./generator";

export async function listRecurrences(actor: Actor, filters: { clientId?: string; status?: "ACTIVE" | "PAUSED" } = {}) {
  assertCan(actor, "recurrences.manage");
  const rows = await prisma.recurrence.findMany({
    where: {
      organizationId: actor.organizationId,
      client: clientScope(actor),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      ...recurrenceInclude,
      assignee: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: [{ client: { tradeName: "asc" } }, { createdAt: "asc" }],
  });
  const holidays = await loadHolidaySet(prisma, actor.organizationId);
  const now = new Date();
  return Promise.all(
    rows.map(async (r) => ({ ...r, blocker: generationBlocker(r), next: await previewNext(r, holidays, now) })),
  );
}

export async function getRecurrence(actor: Actor, id: string) {
  assertCan(actor, "recurrences.manage");
  const r = await prisma.recurrence.findFirst({
    where: { id, organizationId: actor.organizationId, client: clientScope(actor) },
    include: {
      ...recurrenceInclude,
      assignee: { select: { name: true } },
      reviewer: { select: { name: true } },
      tasks: {
        orderBy: { dueAt: "desc" },
        take: 12,
        select: { id: true, title: true, status: true, dueAt: true, occurrenceKey: true },
      },
    },
  });
  if (!r) throw new NotFoundError("Recorrência não encontrada.");
  const holidays = await loadHolidaySet(prisma, actor.organizationId);
  return { ...r, blocker: generationBlocker(r), next: await previewNext(r, holidays, new Date()) };
}

function ruleData(input: RecurrenceInput) {
  return {
    frequency: input.frequency,
    weekdays: input.frequency === "WEEKLY" ? [...new Set(input.weekdays)].sort() : [],
    monthDays: input.frequency === "BIWEEKLY" || input.frequency === "MONTHLY_DAY" ? input.monthDays : [],
    nthBusinessDay: input.frequency === "MONTHLY_NTH_BUSINESS_DAY" ? input.nthBusinessDay ?? 1 : null,
    dueTime: input.dueTime,
    leadDays: input.leadDays,
    startOffsetDays: input.startOffsetDays,
    nonBusinessDayRule: input.nonBusinessDayRule,
    startDate: localDateToDbDate(input.startDate),
    endDate: input.endDate ? localDateToDbDate(input.endDate) : null,
    assigneeId: input.assigneeId ?? null,
    reviewerId: input.reviewerId ?? null,
    projectId: input.projectId ?? null,
  };
}

/** O projeto precisa ser da empresa e do mesmo cliente (ou interno). */
async function validateProject(actor: Actor, input: RecurrenceInput) {
  if (!input.projectId) return;
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: actor.organizationId, status: { notIn: ["CANCELADO"] } },
  });
  if (!project || (project.clientId && project.clientId !== input.clientId)) {
    throw new ValidationError("Projeto inválido para este cliente.", { projectId: "Selecione um projeto do cliente." });
  }
}

async function validatePeople(actor: Actor, input: RecurrenceInput) {
  if (input.assigneeId) await assertUserInOrg(actor.organizationId, input.assigneeId, input.clientId);
  if (input.reviewerId) await assertUserInOrg(actor.organizationId, input.reviewerId, input.clientId);
  if (input.assigneeId && input.assigneeId === input.reviewerId) {
    throw new ValidationError("O revisor deve ser diferente do responsável.", { reviewerId: "Escolha outro revisor." });
  }
}

function todayDb() {
  return localDateToDbDate(instantToLocalDate(new Date(), APP_TIMEZONE));
}

async function generateNow(id: string) {
  const r = await prisma.recurrence.findUniqueOrThrow({ where: { id }, include: recurrenceInclude });
  const holidays = await loadHolidaySet(prisma, r.organizationId);
  return generateForRecurrence(r, holidays, new Date());
}

export async function createRecurrence(actor: Actor, raw: unknown) {
  assertCan(actor, "recurrences.manage");
  const input = parseInput(recurrenceSchema, raw);
  await assertClientAccess(actor, input.clientId);
  const template = await prisma.routineTemplate.findFirst({
    where: { id: input.templateId, organizationId: actor.organizationId, archivedAt: null },
  });
  if (!template) throw new ValidationError("Modelo inválido ou arquivado.", { templateId: "Selecione um modelo ativo." });
  await validatePeople(actor, input);
  await validateProject(actor, input);
  const recurrence = await prisma.$transaction(async (tx) => {
    const r = await tx.recurrence.create({
      data: {
        ...ruleData(input),
        organizationId: actor.organizationId,
        clientId: input.clientId,
        templateId: input.templateId,
        timezone: APP_TIMEZONE,
        generationFloor: todayDb(),
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Recurrence",
      entityId: r.id,
      clientId: input.clientId,
      action: "recurrence.created",
      summary: `Rotina "${template.name}" vinculada ao cliente`,
    });
    if (input.projectId) await tx.task.updateMany({ where: { recurrenceId: r.id, archivedAt: null }, data: { projectId: input.projectId } });
    return r;
  });
  // Gera imediatamente as ocorrências que já estão dentro da antecedência.
  const generated = await generateNow(recurrence.id);
  return { recurrence, generated };
}

/**
 * Alterações na regra valem para as próximas ocorrências: o piso de geração
 * passa a ser hoje, e as tarefas já geradas permanecem como estão.
 */
export async function updateRecurrence(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "recurrences.manage");
  const before = await getRecurrence(actor, id);
  const input = parseInput(recurrenceSchema, { ...(raw as object), clientId: before.clientId, templateId: before.templateId });
  await validatePeople(actor, input);
  await validateProject(actor, { ...input, clientId: before.clientId });
  const data = ruleData(input);
  const changes = diffFields(before as unknown as Record<string, unknown>, data, Object.keys(data));
  if (Object.keys(changes).length === 0) return before;
  const today = todayDb();
  await prisma.$transaction(async (tx) => {
    await tx.recurrence.update({
      where: { id },
      data: { ...data, generationFloor: before.generationFloor > today ? before.generationFloor : today },
    });
    // Trocar o projeto leva junto as tarefas que esta rotina já gerou (histórico incluso).
    if (data.projectId !== before.projectId) {
      await tx.task.updateMany({ where: { recurrenceId: id, archivedAt: null }, data: { projectId: data.projectId } });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Recurrence",
      entityId: id,
      clientId: before.clientId,
      action: "recurrence.updated",
      summary: `Recorrência "${before.template.name}" alterada (vale para as próximas ocorrências)`,
      changes: changes as Prisma.InputJsonValue,
    });
  });
  await generateNow(id);
}

/** Pausar interrompe novas gerações; reativar não gera o período em que esteve pausada. */
export async function setRecurrenceStatus(actor: Actor, id: string, status: "ACTIVE" | "PAUSED") {
  assertCan(actor, "recurrences.manage");
  const r = await getRecurrence(actor, id);
  if (r.status === status) return;
  if (status === "ACTIVE" && r.template.archivedAt) throw new ValidationError("O modelo desta rotina está arquivado.");
  await prisma.$transaction(async (tx) => {
    await tx.recurrence.update({
      where: { id },
      data: { status, ...(status === "ACTIVE" ? { generationFloor: todayDb() } : {}) },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Recurrence",
      entityId: id,
      clientId: r.clientId,
      action: status === "ACTIVE" ? "recurrence.resumed" : "recurrence.paused",
      summary: `Recorrência "${r.template.name}" ${status === "ACTIVE" ? "reativada" : "pausada"}`,
    });
  });
  if (status === "ACTIVE") await generateNow(id);
}

export interface QuickRoutineInput {
  clientId: string;
  templateId?: string;
  title?: string;
  description?: string;
  category?: string;
  mode: "DAILY" | "WEEKLY" | "MONTHLY";
  weekdays?: string[];
  monthDay?: string;
  dueTime: string;
  assigneeId?: string;
  projectId?: string;
}

/**
 * Cadastro rápido de rotina direto no cliente: monta a regra a partir de
 * "todo dia útil / dias da semana / dia do mês" e, sem modelo escolhido,
 * cria um modelo novo automaticamente.
 */
export async function quickAddRoutine(actor: Actor, input: QuickRoutineInput) {
  assertCan(actor, "recurrences.manage");
  await assertClientAccess(actor, input.clientId);
  const client = await prisma.client.findUniqueOrThrow({ where: { id: input.clientId }, select: { tradeName: true } });
  const title = (input.title ?? "").trim();
  if (!input.templateId && !title) throw new ValidationError("Informe o título da rotina.", { title: "Informe o título." });
  if (title.length > 150) throw new ValidationError("Título muito longo.", { title: "Máximo de 150 caracteres." });

  const rule =
    input.mode === "DAILY"
      ? { frequency: "DAILY_BUSINESS", weekdays: [], monthDays: [] }
      : input.mode === "WEEKLY"
        ? { frequency: "WEEKLY", weekdays: input.weekdays ?? [], monthDays: [] }
        : { frequency: "MONTHLY_DAY", weekdays: [], monthDays: input.monthDay ? [input.monthDay] : [] };
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const recurrenceRaw = (templateId: string) => ({
    ...rule,
    clientId: input.clientId,
    templateId,
    startDate: today,
    dueTime: input.dueTime,
    leadDays: "0",
    startOffsetDays: "0",
    nonBusinessDayRule: "POSTPONE",
    assigneeId: input.assigneeId ?? "",
    projectId: input.projectId ?? "",
  });
  // Valida a regra antes de criar qualquer coisa.
  parseInput(recurrenceSchema, recurrenceRaw("pendente"));

  let templateId = input.templateId;
  if (!templateId) {
    const category = (TASK_CATEGORIES as readonly string[]).includes(input.category ?? "") ? input.category! : "OUTRAS";
    const t = await prisma.routineTemplate.create({
      data: {
        organizationId: actor.organizationId,
        name: `${title} — ${client.tradeName}`,
        title,
        description: input.description?.trim() || null,
        category: category as TaskCategory,
        frequency: rule.frequency as Frequency,
        weekdays: rule.weekdays.map(Number),
        monthDays: rule.monthDays.map(Number),
        dueTime: input.dueTime,
        leadDays: 0,
        startOffsetDays: 0,
        nonBusinessDayRule: "POSTPONE",
      },
    });
    templateId = t.id;
  }
  return createRecurrence(actor, recurrenceRaw(templateId));
}
