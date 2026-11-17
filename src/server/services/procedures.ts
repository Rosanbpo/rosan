import { POP_LIBRARY } from "@/domain/pop-library";
import type { Prisma } from "@prisma/client";
import { dbDateToLocalDate, localDateToDbDate } from "@/domain/dates";
import type { ProcedureStatus, TaskCategory } from "@/domain/enums";
import { assertCan, can, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { parseInput, procedureSchema } from "../validation";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

export interface ProcedureFilters {
  q?: string;
  category?: TaskCategory;
  status?: ProcedureStatus;
}

/** Operadores enxergam apenas POPs publicados; gestores e administradores veem todos. */
function visibility(actor: Actor): Prisma.ProcedureWhereInput {
  return can(actor, "procedures.manage")
    ? { organizationId: actor.organizationId }
    : { organizationId: actor.organizationId, status: "PUBLICADO" };
}

export async function listProcedures(actor: Actor, filters: ProcedureFilters = {}) {
  return prisma.procedure.findMany({
    where: {
      AND: [
        visibility(actor),
        { clientId: null },
        ...(filters.category ? [{ category: filters.category }] : []),
        filters.status ? { status: filters.status } : { status: { not: "ARQUIVADO" as const } },
        ...(filters.q
          ? [
              {
                OR: [
                  { title: { contains: filters.q, mode: "insensitive" as const } },
                  { content: { contains: filters.q, mode: "insensitive" as const } },
                  { objective: { contains: filters.q, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      version: true,
      updatedAt: true,
      reviewedAt: true,
      owner: { select: { name: true } },
    },
  });
}

export async function getProcedure(actor: Actor, id: string) {
  const row = await prisma.procedure.findFirst({
    where: { id, ...visibility(actor) },
    include: {
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, tradeName: true } },
      templates: { where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  if (!row) throw new NotFoundError("POP não encontrado.");
  if (row.clientId) await assertClientAccess(actor, row.clientId);
  return { ...row, reviewedAtLocal: row.reviewedAt ? dbDateToLocalDate(row.reviewedAt) : null };
}

/** POPs não arquivados, para vincular a modelos de rotina. */
export async function procedureOptions(actor: Actor) {
  return prisma.procedure.findMany({
    where: { organizationId: actor.organizationId, clientId: null, status: { not: "ARQUIVADO" } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

/** POPs publicados de uma categoria, para sugerir na tarefa. */
export async function publishedByCategory(actor: Actor, category: TaskCategory) {
  return prisma.procedure.findMany({
    where: { organizationId: actor.organizationId, clientId: null, status: "PUBLICADO", category },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
    take: 5,
  });
}

async function assertOwner(actor: Actor, ownerId?: string) {
  if (!ownerId) return;
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: ownerId, organizationId: actor.organizationId } },
  });
  if (!m || !m.active) throw new ValidationError("O responsável não pertence à empresa.", { ownerId: "Selecione um responsável." });
}

function toData(input: ReturnType<typeof procedureSchema.parse>) {
  // clientId só é definido na criação (ver createProcedure); nunca muda depois.
  return {
    title: input.title,
    category: input.category,
    status: input.status,
    objective: input.objective ?? null,
    content: input.content,
    tools: input.tools ?? null,
    responsible: input.responsible ?? null,
    ownerId: input.ownerId ?? null,
    reviewedAt: input.reviewedAt ? localDateToDbDate(input.reviewedAt) : null,
  };
}

export async function createProcedure(actor: Actor, raw: unknown) {
  assertCan(actor, "procedures.manage");
  const input = parseInput(procedureSchema, raw);
  await assertOwner(actor, input.ownerId);
  if (input.clientId) await assertClientAccess(actor, input.clientId);
  return prisma.$transaction(async (tx) => {
    const row = await tx.procedure.create({ data: { organizationId: actor.organizationId, clientId: input.clientId ?? null, ...toData(input) } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Procedure",
      entityId: row.id,
      action: "procedure.created",
      summary: `POP criado: ${row.title}`,
    });
    return row;
  });
}

/** O número da versão sobe quando o conteúdo do passo a passo muda. */
export async function updateProcedure(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "procedures.manage");
  const input = parseInput(procedureSchema, raw);
  const current = await getProcedure(actor, id);
  await assertOwner(actor, input.ownerId);
  const contentChanged = current.content.trim() !== input.content.trim();
  await prisma.$transaction(async (tx) => {
    await tx.procedure.update({ where: { id }, data: { ...toData(input), ...(contentChanged ? { version: { increment: 1 } } : {}) } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Procedure",
      entityId: id,
      action: "procedure.updated",
      summary: contentChanged ? `POP atualizado (nova versão ${current.version + 1})` : "POP atualizado",
    });
  });
}

/** Importa os processos prontos do escritório; ignora os que já existem (pelo título). */
export async function importPopLibrary(actor: Actor) {
  assertCan(actor, "procedures.manage");
  const existing = await prisma.procedure.findMany({ where: { organizationId: actor.organizationId }, select: { title: true } });
  const have = new Set(existing.map((e) => e.title.toLowerCase()));
  const missing = POP_LIBRARY.filter((p) => !have.has(p.title.toLowerCase()));
  if (!missing.length) return { created: 0, skipped: POP_LIBRARY.length };
  await prisma.$transaction(async (tx) => {
    for (const p of missing) {
      const row = await tx.procedure.create({
        data: {
          organizationId: actor.organizationId,
          title: p.title,
          category: p.category,
          status: "PUBLICADO",
          objective: p.objective,
          content: p.content,
          tools: p.tools ?? null,
          responsible: p.responsible ?? null,
        },
      });
      await recordAudit(tx, {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        entityType: "Procedure",
        entityId: row.id,
        action: "procedure.created",
        summary: `POP importado: ${row.title}`,
      });
    }
  });
  return { created: missing.length, skipped: POP_LIBRARY.length - missing.length };
}

/** POPs exclusivos de um cliente. */
export async function listClientProcedures(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.procedure.findMany({
    where: { ...visibility(actor), clientId, status: { not: "ARQUIVADO" } },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: { id: true, title: true, category: true, status: true, version: true, updatedAt: true },
  });
}

/** Cria uma cópia de um POP padrão para o cliente, pronta para receber as particularidades dele. */
export async function copyProcedureToClient(actor: Actor, procedureId: string, clientId: string) {
  assertCan(actor, "procedures.manage");
  await assertClientAccess(actor, clientId);
  const base = await prisma.procedure.findFirst({ where: { id: procedureId, organizationId: actor.organizationId, clientId: null } });
  if (!base) throw new NotFoundError("POP não encontrado.");
  return prisma.$transaction(async (tx) => {
    const row = await tx.procedure.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        title: base.title,
        category: base.category,
        status: "RASCUNHO",
        objective: base.objective,
        content: base.content,
        tools: base.tools,
        responsible: base.responsible,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Procedure",
      entityId: row.id,
      clientId,
      action: "procedure.created",
      summary: `POP do cliente criado a partir de: ${base.title}`,
    });
    return row;
  });
}
