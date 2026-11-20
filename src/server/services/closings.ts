import { instantToLocalDate, localDateTimeToInstant, makeLocalDate, parseLocalDate } from "@/domain/dates";
import { isCompetenceMonth } from "@/domain/closing";
import { getChecklistLines } from "./checklists";
import { NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

function monthRange(month: string) {
  const { y, m } = parseLocalDate(`${month}-01`);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return {
    from: localDateTimeToInstant(makeLocalDate(y, m, 1), "00:00", APP_TIMEZONE),
    to: localDateTimeToInstant(makeLocalDate(next.y, next.m, 1), "00:00", APP_TIMEZONE),
  };
}

function checkMonth(month: string) {
  if (!isCompetenceMonth(month)) throw new ValidationError("Competência inválida.");
}

/** Fechamento do mês (ou null se ainda não foi iniciado), mais o retrato do mês nas tarefas. */
export async function getClosing(actor: Actor, clientId: string, month: string) {
  await assertClientAccess(actor, clientId);
  checkMonth(month);
  const { from, to } = monthRange(month);
  const [closing, tasks] = await Promise.all([
    prisma.clientClosing.findUnique({
      where: { clientId_competence: { clientId, competence: month } },
      include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { doneBy: { select: { name: true } } } } },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { organizationId: actor.organizationId, clientId, archivedAt: null, dueAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
  ]);
  const count = (f: (s: string) => boolean) => tasks.filter((t) => f(t.status)).reduce((a, t) => a + t._count._all, 0);
  return {
    closing,
    tasks: {
      done: count((s) => s === "CONCLUIDA"),
      open: count((s) => s !== "CONCLUIDA" && s !== "CANCELADA"),
    },
  };
}

export async function startClosing(actor: Actor, clientId: string, month: string) {
  await assertClientAccess(actor, clientId);
  checkMonth(month);
  const existing = await prisma.clientClosing.findUnique({ where: { clientId_competence: { clientId, competence: month } } });
  if (existing) return existing;
  const labels = await getChecklistLines(actor.organizationId, "CLOSING");
  return prisma.$transaction(async (tx) => {
    const row = await tx.clientClosing.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        competence: month,
        items: { create: labels.map((label, position) => ({ label, position })) },
      },
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Client", entityId: clientId, clientId, action: "CLOSING_STARTED", summary: `Fechamento ${month} iniciado` });
    return row;
  });
}

async function loadItem(actor: Actor, itemId: string) {
  const item = await prisma.closingItem.findFirst({ where: { id: itemId, closing: { organizationId: actor.organizationId } }, include: { closing: true } });
  if (!item) throw new NotFoundError("Item não encontrado.");
  await assertClientAccess(actor, item.closing.clientId);
  return item;
}

async function syncClosed(tx: Pick<typeof prisma, "closingItem" | "clientClosing">, closingId: string) {
  const items = await tx.closingItem.findMany({ where: { closingId }, select: { doneAt: true } });
  const all = items.length > 0 && items.every((i) => i.doneAt);
  await tx.clientClosing.update({ where: { id: closingId }, data: { closedAt: all ? new Date() : null } });
}

export async function setClosingItemDone(actor: Actor, itemId: string, done: boolean) {
  const item = await loadItem(actor, itemId);
  await prisma.$transaction(async (tx) => {
    await tx.closingItem.update({ where: { id: itemId }, data: { doneAt: done ? new Date() : null, doneById: done ? actor.userId : null } });
    await syncClosed(tx, item.closingId);
  });
  return { clientId: item.closing.clientId };
}

export async function addClosingItem(actor: Actor, closingId: string, label: string) {
  const closing = await prisma.clientClosing.findFirst({ where: { id: closingId, organizationId: actor.organizationId } });
  if (!closing) throw new NotFoundError("Fechamento não encontrado.");
  await assertClientAccess(actor, closing.clientId);
  const clean = label.trim();
  if (!clean) throw new ValidationError("Informe o item.");
  if (clean.length > 200) throw new ValidationError("Item muito longo.");
  const last = await prisma.closingItem.aggregate({ where: { closingId }, _max: { position: true } });
  await prisma.$transaction(async (tx) => {
    await tx.closingItem.create({ data: { closingId, label: clean, position: (last._max.position ?? -1) + 1 } });
    await syncClosed(tx, closingId);
  });
  return { clientId: closing.clientId };
}

export async function removeClosingItem(actor: Actor, itemId: string) {
  const item = await loadItem(actor, itemId);
  await prisma.$transaction(async (tx) => {
    await tx.closingItem.delete({ where: { id: itemId } });
    await syncClosed(tx, item.closingId);
  });
  return { clientId: item.closing.clientId };
}

/** Resumo dos últimos meses, para o histórico de fechamentos do cliente. */
export async function closingHistory(actor: Actor, clientId: string, months = 6) {
  await assertClientAccess(actor, clientId);
  const rows = await prisma.clientClosing.findMany({
    where: { organizationId: actor.organizationId, clientId },
    orderBy: { competence: "desc" },
    take: months,
    include: { items: { select: { doneAt: true } } },
  });
  return rows.map((r) => ({ competence: r.competence, closedAt: r.closedAt, done: r.items.filter((i) => i.doneAt).length, total: r.items.length }));
}

export function currentCompetence() {
  return instantToLocalDate(new Date(), APP_TIMEZONE).slice(0, 7);
}
