import type { Prisma } from "@prisma/client";
import { localDateToDbDate } from "@/domain/dates";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import type { ClientStatus } from "@/domain/enums";
import { prisma } from "../db";
import { PAGE_SIZE } from "../config";
import { clientSchema, parseInput, type ClientInput } from "../validation";
import { assertClientAccess, clientScope } from "./access";
import { diffFields, recordAudit } from "./audit";

export interface ClientListFilters {
  q?: string;
  status?: ClientStatus;
  archived?: boolean;
  page?: number;
}

export async function listClients(actor: Actor, filters: ClientListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.ClientWhereInput = {
    ...clientScope(actor),
    archivedAt: filters.archived ? { not: null } : null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { tradeName: { contains: filters.q, mode: "insensitive" } },
            { legalName: { contains: filters.q, mode: "insensitive" } },
            { cnpj: { contains: filters.q.replace(/\D/g, "") || filters.q } },
          ],
        }
      : {}),
  };
  const now = new Date();
  const [total, rows] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { tradeName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        responsibleOperator: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        _count: {
          select: {
            tasks: { where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, archivedAt: null } },
            pendings: { where: { resolvedAt: null } },
          },
        },
      },
    }),
  ]);
  const overdue = await prisma.task.groupBy({
    by: ["clientId"],
    where: {
      clientId: { in: rows.map((r) => r.id) },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      dueAt: { lt: now },
      archivedAt: null,
    },
    _count: { _all: true },
  });
  const overdueMap = new Map(overdue.map((o) => [o.clientId, o._count._all]));
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    rows: rows.map((r) => ({ ...r, overdueCount: overdueMap.get(r.id) ?? 0 })),
  };
}

/** Clientes acessíveis em formato enxuto, para seletores. */
export async function clientOptions(actor: Actor) {
  return prisma.client.findMany({
    where: { ...clientScope(actor), archivedAt: null, status: { not: "ENCERRADO" } },
    select: { id: true, tradeName: true },
    orderBy: { tradeName: "asc" },
  });
}

export async function getClient(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      responsibleOperator: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      recurrences: {
        include: { template: { select: { name: true } }, assignee: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function validateMembers(actor: Actor, input: { responsibleOperatorId?: string; managerId?: string; memberIds: string[] }) {
  const ids = new Set([...input.memberIds]);
  if (input.responsibleOperatorId) ids.add(input.responsibleOperatorId);
  if (input.managerId) ids.add(input.managerId);
  const memberships = await prisma.membership.findMany({
    where: { organizationId: actor.organizationId, userId: { in: [...ids] }, active: true },
  });
  const byUser = new Map(memberships.map((m) => [m.userId, m]));
  for (const id of ids) {
    if (!byUser.has(id)) throw new ValidationError("Há usuários que não pertencem à empresa.");
  }
  if (input.managerId && byUser.get(input.managerId)?.role === "OPERADOR") {
    throw new ValidationError("O gestor do cliente deve ter papel de gestor ou administrador.", {
      managerId: "Selecione um gestor.",
    });
  }
  return [...ids];
}

function toData(input: ClientInput) {
  return {
    legalName: input.legalName,
    tradeName: input.tradeName,
    cnpj: input.cnpj ?? null,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    contactChannels: input.contactChannels ?? null,
    status: input.status,
    services: input.services,
    startDate: input.startDate ? localDateToDbDate(input.startDate) : null,
    notes: input.notes ?? null,
    responsibleOperatorId: input.responsibleOperatorId ?? null,
    managerId: input.managerId ?? null,
  };
}

async function assertUniqueCnpj(actor: Actor, cnpj: string | undefined, exceptId?: string) {
  if (!cnpj) return;
  const existing = await prisma.client.findFirst({
    where: { organizationId: actor.organizationId, cnpj, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (existing) throw new ValidationError("Já existe um cliente com este CNPJ.", { cnpj: "CNPJ já cadastrado." });
}

export async function createClient(actor: Actor, raw: unknown) {
  assertCan(actor, "clients.manage");
  const input = parseInput(clientSchema, raw);
  await assertUniqueCnpj(actor, input.cnpj);
  const memberIds = await validateMembers(actor, input);
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        ...toData(input),
        organizationId: actor.organizationId,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: client.id,
      clientId: client.id,
      action: "client.created",
      summary: `Cliente "${client.tradeName}" cadastrado`,
    });
    return client;
  });
}

export async function updateClient(actor: Actor, clientId: string, raw: unknown) {
  assertCan(actor, "clients.manage");
  const before = await assertClientAccess(actor, clientId);
  const input = parseInput(clientSchema, raw);
  await assertUniqueCnpj(actor, input.cnpj, clientId);
  const memberIds = await validateMembers(actor, input);
  const data = toData(input);
  return prisma.$transaction(async (tx) => {
    const previousMembers = await tx.clientMember.findMany({ where: { clientId } });
    await tx.clientMember.deleteMany({ where: { clientId, userId: { notIn: memberIds } } });
    await tx.clientMember.createMany({
      data: memberIds.map((userId) => ({ clientId, userId })),
      skipDuplicates: true,
    });
    const client = await tx.client.update({ where: { id: clientId }, data });
    const changes = diffFields(before as unknown as Record<string, unknown>, data, Object.keys(data));
    const prevIds = previousMembers.map((m) => m.userId).sort();
    if (JSON.stringify(prevIds) !== JSON.stringify([...memberIds].sort()))
      changes.vinculos = { de: prevIds, para: [...memberIds].sort() };
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: clientId,
      clientId,
      action: "client.updated",
      summary: `Cadastro do cliente "${client.tradeName}" alterado`,
      changes: changes as Prisma.InputJsonValue,
    });
    return client;
  });
}

/** Arquivar preserva todo o histórico; recorrências ativas são pausadas. */
export async function setClientArchived(actor: Actor, clientId: string, archived: boolean) {
  assertCan(actor, "clients.manage");
  const client = await assertClientAccess(actor, clientId);
  await prisma.$transaction(async (tx) => {
    await tx.client.update({ where: { id: clientId }, data: { archivedAt: archived ? new Date() : null } });
    if (archived) {
      await tx.recurrence.updateMany({ where: { clientId, status: "ACTIVE" }, data: { status: "PAUSED" } });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: clientId,
      clientId,
      action: archived ? "client.archived" : "client.unarchived",
      summary: archived
        ? `Cliente "${client.tradeName}" arquivado (recorrências pausadas)`
        : `Cliente "${client.tradeName}" reativado`,
    });
  });
}

export async function clientIndicators(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const base = { clientId, archivedAt: null } satisfies Prisma.TaskWhereInput;
  const [open, overdue, waiting, review, completed] = await Promise.all([
    prisma.task.count({ where: { ...base, status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.task.count({ where: { ...base, status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { lt: now } } }),
    prisma.task.count({ where: { ...base, status: { in: ["AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO"] } } }),
    prisma.task.count({ where: { ...base, status: "EM_REVISAO" } }),
    prisma.task.findMany({
      where: { ...base, status: "CONCLUIDA", completedAt: { gte: since } },
      select: { completedAt: true, dueAt: true },
    }),
  ]);
  const onTime = completed.filter((t) => t.completedAt && t.completedAt <= t.dueAt).length;
  return {
    open,
    overdue,
    waiting,
    review,
    completed30: completed.length,
    onTimeRate: completed.length ? onTime / completed.length : null,
  };
}

export async function clientHistory(actor: Actor, clientId: string, take = 30) {
  await assertClientAccess(actor, clientId);
  return prisma.auditEvent.findMany({
    where: { organizationId: actor.organizationId, clientId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { name: true } } },
  });
}
