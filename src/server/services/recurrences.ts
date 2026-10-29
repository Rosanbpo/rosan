import type { Prisma } from "@prisma/client";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
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
  };
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
  const data = ruleData(input);
  const changes = diffFields(before as unknown as Record<string, unknown>, data, Object.keys(data));
  if (Object.keys(changes).length === 0) return before;
  const today = todayDb();
  await prisma.$transaction(async (tx) => {
    await tx.recurrence.update({
      where: { id },
      data: { ...data, generationFloor: before.generationFloor > today ? before.generationFloor : today },
    });
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
