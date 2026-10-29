import type { Prisma } from "@prisma/client";
import { assertCan, can, ForbiddenError, NotFoundError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { parseInput, templateSchema, type TemplateInput } from "../validation";
import { diffFields, recordAudit } from "./audit";

function canRead(actor: Actor) {
  // Gestores consultam modelos para criar recorrências; só o administrador edita.
  if (!can(actor, "recurrences.manage")) throw new ForbiddenError();
}

export async function listTemplates(actor: Actor, opts: { archived?: boolean } = {}) {
  canRead(actor);
  return prisma.routineTemplate.findMany({
    where: { organizationId: actor.organizationId, archivedAt: opts.archived ? { not: null } : null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { checklistItems: true, recurrences: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function getTemplate(actor: Actor, id: string) {
  canRead(actor);
  const template = await prisma.routineTemplate.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      checklistItems: { orderBy: { position: "asc" } },
      recurrences: {
        include: { client: { select: { id: true, tradeName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!template) throw new NotFoundError("Modelo não encontrado.");
  return template;
}

function toData(input: TemplateInput) {
  return {
    name: input.name,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    priority: input.priority,
    estimatedMinutes: input.estimatedMinutes ?? null,
    requiresEvidence: input.requiresEvidence,
    competenceRule: input.competenceRule,
    frequency: input.frequency,
    weekdays: input.frequency === "WEEKLY" ? input.weekdays : [],
    monthDays: input.frequency === "BIWEEKLY" || input.frequency === "MONTHLY_DAY" ? input.monthDays : [],
    nthBusinessDay: input.frequency === "MONTHLY_NTH_BUSINESS_DAY" ? input.nthBusinessDay ?? 1 : null,
    dueTime: input.dueTime,
    leadDays: input.leadDays,
    startOffsetDays: input.startOffsetDays,
    nonBusinessDayRule: input.nonBusinessDayRule,
  };
}

export async function createTemplate(actor: Actor, raw: unknown) {
  assertCan(actor, "templates.manage");
  const input = parseInput(templateSchema, raw);
  return prisma.$transaction(async (tx) => {
    const template = await tx.routineTemplate.create({
      data: {
        ...toData(input),
        organizationId: actor.organizationId,
        checklistItems: {
          create: input.checklist.map((c, position) => ({ label: c.label, required: c.required, position })),
        },
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "RoutineTemplate",
      entityId: template.id,
      action: "template.created",
      summary: `Modelo "${template.name}" criado`,
    });
    return template;
  });
}

/**
 * Alterações no modelo valem para as próximas ocorrências geradas. As
 * tarefas já geradas guardam uma cópia (título, checklist etc.) e não mudam.
 */
export async function updateTemplate(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "templates.manage");
  const before = await getTemplate(actor, id);
  const input = parseInput(templateSchema, raw);
  const data = toData(input);
  const changes: Record<string, unknown> = diffFields(
    before as unknown as Record<string, unknown>,
    data,
    Object.keys(data),
  );
  const oldChecklist = before.checklistItems.map((c) => `${c.label}${c.required ? " *" : ""}`);
  const newChecklist = input.checklist.map((c) => `${c.label}${c.required ? " *" : ""}`);
  if (JSON.stringify(oldChecklist) !== JSON.stringify(newChecklist)) changes.checklist = { de: oldChecklist, para: newChecklist };
  return prisma.$transaction(async (tx) => {
    await tx.templateChecklistItem.deleteMany({ where: { templateId: id } });
    const template = await tx.routineTemplate.update({
      where: { id },
      data: {
        ...data,
        checklistItems: {
          create: input.checklist.map((c, position) => ({ label: c.label, required: c.required, position })),
        },
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "RoutineTemplate",
      entityId: id,
      action: "template.updated",
      summary: `Modelo "${template.name}" alterado`,
      changes: changes as Prisma.InputJsonValue,
    });
    return template;
  });
}

export async function setTemplateArchived(actor: Actor, id: string, archived: boolean) {
  assertCan(actor, "templates.manage");
  const template = await getTemplate(actor, id);
  await prisma.$transaction(async (tx) => {
    await tx.routineTemplate.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    if (archived) {
      await tx.recurrence.updateMany({ where: { templateId: id, status: "ACTIVE" }, data: { status: "PAUSED" } });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "RoutineTemplate",
      entityId: id,
      action: archived ? "template.archived" : "template.unarchived",
      summary: archived
        ? `Modelo "${template.name}" arquivado (recorrências vinculadas pausadas)`
        : `Modelo "${template.name}" reativado`,
    });
  });
}
