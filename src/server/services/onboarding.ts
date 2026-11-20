import { addDays, instantToLocalDate } from "@/domain/dates";
import { ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { createTask } from "./tasks";

import { onboardingSteps } from "./checklists";

const txt = (max: number) => (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new ValidationError("Texto muito longo.");
  return s || null;
};

export async function getOnboarding(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.clientOnboarding.findUnique({ where: { clientId } });
}

export async function saveOnboarding(actor: Actor, clientId: string, raw: Record<string, unknown>) {
  await assertClientAccess(actor, clientId);
  const data = {
    goals: txt(4000)(raw.goals),
    ourResponsibilities: txt(4000)(raw.ourResponsibilities),
    clientResponsibilities: txt(4000)(raw.clientResponsibilities),
    officialChannel: txt(200)(raw.officialChannel),
    erp: txt(200)(raw.erp),
    defaultEmail: txt(200)(raw.defaultEmail),
  };
  await prisma.clientOnboarding.upsert({ where: { clientId }, create: { clientId, organizationId: actor.organizationId, ...data }, update: data });
}

/** Cria as 5 tarefas padrão do onboarding (uma vez por cliente). */
export async function createOnboardingTasks(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const steps = await onboardingSteps(actor.organizationId);
  const existing = await prisma.task.count({ where: { clientId, organizationId: actor.organizationId, title: { in: steps.map((s) => s.title) }, archivedAt: null } });
  if (existing > 0) throw new ValidationError("As tarefas de onboarding já foram criadas para este cliente.");
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { responsibleOperatorId: true } });
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  for (const step of steps) {
    await createTask(actor, {
      clientId,
      title: step.title,
      description: step.description,
      category: "IMPLANTACAO",
      priority: "NORMAL",
      assigneeId: client.responsibleOperatorId ?? actor.userId,
      dueDate: addDays(today, step.days),
      dueTime: "17:00",
      checklist: [],
      requiresEvidence: false,
      competence: undefined,
      projectId: undefined,
      estimatedMinutes: undefined,
    });
  }
}
