import type { Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { listTemplates } from "./templates";

/** Modelos ativos com a regra padrão, para o formulário de recorrência. */
export async function templateOptions(actor: Actor) {
  const templates = await listTemplates(actor);
  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    rule: {
      frequency: t.frequency,
      weekdays: t.weekdays,
      monthDays: t.monthDays,
      nthBusinessDay: t.nthBusinessDay,
      dueTime: t.dueTime,
      leadDays: t.leadDays,
      startOffsetDays: t.startOffsetDays,
      nonBusinessDayRule: t.nonBusinessDayRule,
    },
  }));
}

export async function organizationName(actor: Actor) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
  return org.name;
}

/** Modelos para "puxar de um modelo pronto" na nova tarefa (qualquer usuário logado). */
export async function templatePrefills(actor: Actor) {
  const rows = await prisma.routineTemplate.findMany({
    where: { organizationId: actor.organizationId, exclusiveClientId: null, archivedAt: null },
    orderBy: { name: "asc" },
    include: { checklistItems: { orderBy: { position: "asc" } } },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    checklist: t.checklistItems.map((c) => ({ label: c.label, required: c.required })),
  }));
}
