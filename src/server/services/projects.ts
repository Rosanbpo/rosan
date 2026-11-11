import type { Prisma } from "@prisma/client";
import { addDays, dbDateToLocalDate, localDateTimeToInstant, localDateToDbDate, weekday } from "@/domain/dates";
import { IMPLANTATION_DAYS, IMPLANTATION_STEPS } from "@/domain/implantation";
import { APP_TIMEZONE } from "../config";
import type { ProjectStatus } from "@/domain/enums";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { implantationSchema, parseInput, projectSchema } from "../validation";
import { assertClientAccess, clientScope } from "./access";
import { recordAudit } from "./audit";

/** Projetos sem cliente são internos e visíveis a todos; os demais seguem o acesso ao cliente. */
export function projectScope(actor: Actor): Prisma.ProjectWhereInput {
  return {
    organizationId: actor.organizationId,
    OR: [{ clientId: null }, { client: clientScope(actor) }],
  };
}

export interface ProjectFilters {
  q?: string;
  status?: ProjectStatus;
  clientId?: string;
  includeClosed?: boolean;
}

export async function listProjects(actor: Actor, filters: ProjectFilters = {}) {
  const rows = await prisma.project.findMany({
    where: {
      AND: [
        projectScope(actor),
        filters.status
          ? { status: filters.status }
          : filters.includeClosed
            ? {}
            : { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
        ...(filters.clientId ? [{ clientId: filters.clientId }] : []),
        ...(filters.q ? [{ name: { contains: filters.q, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    include: {
      client: { select: { id: true, tradeName: true } },
      owner: { select: { name: true } },
    },
  });
  const counts = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: rows.map((r) => r.id) }, archivedAt: null, status: { not: "CANCELADA" } },
    _count: { _all: true },
  });
  return rows.map((r) => {
    const mine = counts.filter((c) => c.projectId === r.id);
    const total = mine.reduce((a, c) => a + c._count._all, 0);
    const done = mine.filter((c) => c.status === "CONCLUIDA").reduce((a, c) => a + c._count._all, 0);
    return {
      id: r.id,
      name: r.name,
      status: r.status as ProjectStatus,
      client: r.client,
      ownerName: r.owner?.name ?? null,
      dueDate: r.dueDate ? dbDateToLocalDate(r.dueDate) : null,
      total,
      done,
    };
  });
}

export async function getProject(actor: Actor, id: string, range?: { from: Date; to: Date }) {
  const project = await prisma.project.findFirst({
    where: { id, ...projectScope(actor) },
    include: { client: { select: { id: true, tradeName: true } }, owner: { select: { id: true, name: true } } },
  });
  if (!project) throw new NotFoundError("Projeto não encontrado.");
  const tasks = await prisma.task.findMany({
    where: { projectId: id, archivedAt: null, ...(range ? { dueAt: { gte: range.from, lt: range.to } } : {}) },
    orderBy: [{ dueAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      client: { select: { tradeName: true } },
      assignee: { select: { name: true } },
    },
  });
  const minutes = await prisma.timeEntry.aggregate({ where: { task: { projectId: id } }, _sum: { minutes: true } });
  const recurring = await prisma.task.count({ where: { projectId: id, archivedAt: null, origin: "RECORRENTE" } });
  return {
    recurring: recurring > 0,
    project: {
      ...project,
      startLocal: project.startDate ? dbDateToLocalDate(project.startDate) : null,
      dueLocal: project.dueDate ? dbDateToLocalDate(project.dueDate) : null,
    },
    tasks,
    minutes: minutes._sum.minutes ?? 0,
  };
}

/** Projetos que podem receber tarefas do cliente informado (do cliente ou internos), ainda abertos. */
export async function projectOptions(actor: Actor, clientId?: string) {
  return prisma.project.findMany({
    where: {
      AND: [
        projectScope(actor),
        { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
        ...(clientId ? [{ OR: [{ clientId }, { clientId: null }] }] : []),
      ],
    },
    select: { id: true, name: true, clientId: true },
    orderBy: { name: "asc" },
  });
}

/** Valida que a tarefa pode pertencer ao projeto (mesmo cliente, ou projeto interno). */
export async function assertProjectForTask(actor: Actor, projectId: string | undefined | null, clientId: string) {
  if (!projectId) return;
  const project = await prisma.project.findFirst({ where: { id: projectId, ...projectScope(actor) } });
  if (!project) throw new ValidationError("Projeto não encontrado.", { projectId: "Selecione um projeto válido." });
  if (project.clientId && project.clientId !== clientId) {
    throw new ValidationError("O projeto pertence a outro cliente.", { projectId: "Projeto de outro cliente." });
  }
}

function toData(input: ReturnType<typeof projectSchema.parse>) {
  return {
    name: input.name,
    description: input.description ?? null,
    clientId: input.clientId ?? null,
    status: input.status,
    startDate: input.startDate ? localDateToDbDate(input.startDate) : null,
    dueDate: input.dueDate ? localDateToDbDate(input.dueDate) : null,
    ownerId: input.ownerId ?? null,
  };
}

async function assertOwner(actor: Actor, ownerId?: string) {
  if (!ownerId) return;
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: ownerId, organizationId: actor.organizationId } },
  });
  if (!m || !m.active) throw new ValidationError("O responsável não pertence à empresa.", { ownerId: "Selecione um responsável." });
}

export async function createProject(actor: Actor, raw: unknown) {
  assertCan(actor, "projects.manage");
  const input = parseInput(projectSchema, raw);
  if (input.clientId) await assertClientAccess(actor, input.clientId);
  await assertOwner(actor, input.ownerId);
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({ data: { organizationId: actor.organizationId, ...toData(input) } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Project",
      entityId: project.id,
      clientId: project.clientId,
      action: "project.created",
      summary: `Projeto criado: ${project.name}`,
    });
    return project;
  });
}

export async function updateProject(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "projects.manage");
  const input = parseInput(projectSchema, raw);
  const { project } = await getProject(actor, id);
  if (input.clientId) await assertClientAccess(actor, input.clientId);
  await assertOwner(actor, input.ownerId);
  if (input.clientId !== (project.clientId ?? undefined)) {
    const mismatched = await prisma.task.count({
      where: { projectId: id, ...(input.clientId ? { clientId: { not: input.clientId } } : {}) },
    });
    if (mismatched)
      throw new ValidationError("Há tarefas de outros clientes neste projeto. Remova-as do projeto antes de trocar o cliente.", {
        clientId: "Projeto tem tarefas de outro cliente.",
      });
  }
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: toData(input) });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Project",
      entityId: id,
      clientId: input.clientId ?? null,
      action: "project.updated",
      summary: "Projeto atualizado",
    });
  });
}

/**
 * Cria o projeto "Implantação" de um cliente com o roteiro padrão de tarefas.
 * Cada tarefa vence em dia útil (sábado e domingo passam para segunda) às 18h.
 */
export async function createImplantationProject(actor: Actor, raw: unknown) {
  assertCan(actor, "projects.manage");
  const input = parseInput(implantationSchema, raw);
  await assertClientAccess(actor, input.clientId);
  await assertOwner(actor, input.ownerId);
  const client = await prisma.client.findUniqueOrThrow({ where: { id: input.clientId }, select: { tradeName: true } });
  const existing = await prisma.project.findFirst({
    where: { organizationId: actor.organizationId, clientId: input.clientId, name: { startsWith: "Implantação" }, status: { not: "CANCELADO" } },
  });
  if (existing) {
    throw new ValidationError("Este cliente já tem um projeto de implantação.", { clientId: "Já existe uma implantação para este cliente." });
  }
  const businessDay = (date: string) => {
    const w = weekday(date);
    return w === 6 ? addDays(date, 2) : w === 0 ? addDays(date, 1) : date;
  };
  const dueDate = businessDay(addDays(input.startDate, IMPLANTATION_DAYS));
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId: actor.organizationId,
        clientId: input.clientId,
        name: `Implantação — ${client.tradeName}`,
        description: "Roteiro padrão de implantação: início, diagnóstico, configuração e rotina.",
        status: "EM_ANDAMENTO",
        startDate: localDateToDbDate(input.startDate),
        dueDate: localDateToDbDate(dueDate),
        ownerId: input.ownerId ?? null,
      },
    });
    for (const step of IMPLANTATION_STEPS) {
      await tx.task.create({
        data: {
          organizationId: actor.organizationId,
          clientId: input.clientId,
          projectId: project.id,
          title: step.title,
          description: [step.phase, step.description].filter(Boolean).join(" — "),
          category: step.category,
          estimatedMinutes: step.estimatedMinutes,
          dueAt: localDateTimeToInstant(businessDay(addDays(input.startDate, step.offsetDays)), "18:00", APP_TIMEZONE),
          assigneeId: input.ownerId ?? null,
          createdById: actor.userId,
          origin: "MANUAL",
        },
      });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Project",
      entityId: project.id,
      clientId: project.clientId,
      action: "project.implantation_created",
      summary: `Implantação criada com ${IMPLANTATION_STEPS.length} tarefas`,
    });
    return project;
  });
}
