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
