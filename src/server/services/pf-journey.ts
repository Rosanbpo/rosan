import type { Prisma } from "@prisma/client";
import { dbDateToLocalDate, isValidLocalDate, localDateToDbDate } from "@/domain/dates";
import { ValidationError, assertCan, type Actor } from "@/domain/permissions";
import {
  PF_CONTINUITY, PF_STAGES, PF_STATUSES, PF_STATUS_LABEL, itemKey, pfDeadlines, statusForContinuity,
  type PfContinuity, type PfStatus,
} from "@/domain/pf-journey";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

const iso = (d: Date | null) => (d ? dbDateToLocalDate(d) : null);

export async function ensurePfJourney(actor: Actor, clientId: string) {
  return prisma.pfJourney.upsert({
    where: { clientId },
    create: { clientId, organizationId: actor.organizationId },
    update: {},
  });
}

export async function getPfJourney(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { serviceLines: true } });
  if (!client.serviceLines.includes("CONSULTORIA_PF")) return null;
  const j = await ensurePfJourney(actor, clientId);
  const history = await prisma.pfJourneyEvent.findMany({ where: { journeyId: j.id }, orderBy: { createdAt: "desc" }, take: 40 });
  const view = {
    id: j.id,
    status: j.status as PfStatus,
    startDate: iso(j.startDate),
    meeting1At: iso(j.meeting1At),
    meeting2At: iso(j.meeting2At),
    appBonusStart: iso(j.appBonusStart),
    continuity: j.continuity as PfContinuity | null,
    paidAt: iso(j.paidAt),
    appInvitedAt: j.appInvitedAt,
    notes: j.notes,
    doneItems: j.doneItems,
  };
  return { ...view, ...pfDeadlines(view), history };
}

async function log(tx: Prisma.TransactionClient, actor: Actor, journeyId: string, clientId: string, summary: string) {
  await tx.pfJourneyEvent.create({ data: { journeyId, actorId: actor.userId, summary } });
  await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Client", entityId: clientId, clientId, action: "pf.updated", summary: `Consultoria PF: ${summary}` });
}

async function load(actor: Actor, clientId: string) {
  assertCan(actor, "clients.manage");
  await assertClientAccess(actor, clientId);
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { serviceLines: true } });
  if (!client.serviceLines.includes("CONSULTORIA_PF")) throw new ValidationError("Este cliente não contratou a Consultoria Financeira Pessoa Física.");
  return ensurePfJourney(actor, clientId);
}

function dateOrNull(v: unknown, label: string): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (!isValidLocalDate(s)) throw new ValidationError(`${label}: data inválida.`);
  return s;
}

/** Datas, observações e pagamento. Reunião 2 não pode vir antes da 1. */
export async function savePfDates(actor: Actor, clientId: string, raw: Record<string, unknown>) {
  const j = await load(actor, clientId);
  const startDate = dateOrNull(raw.startDate, "Início");
  const meeting1At = dateOrNull(raw.meeting1At, "Reunião 1");
  const meeting2At = dateOrNull(raw.meeting2At, "Reunião 2");
  const appBonusStart = dateOrNull(raw.appBonusStart, "Início do bônus do app");
  const paidAt = dateOrNull(raw.paidAt, "Pagamento");
  if (meeting1At && meeting2At && meeting2At < meeting1At) throw new ValidationError("A reunião 2 não pode ser antes da reunião 1.");
  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 4000) || null : null;
  const d = (v: string | null) => (v ? localDateToDbDate(v) : null);
  await prisma.$transaction(async (tx) => {
    await tx.pfJourney.update({ where: { id: j.id }, data: { startDate: d(startDate), meeting1At: d(meeting1At), meeting2At: d(meeting2At), appBonusStart: d(appBonusStart), paidAt: d(paidAt), notes } });
    await log(tx, actor, j.id, clientId, "datas e dados atualizados");
  });
}

export async function setPfStatus(actor: Actor, clientId: string, status: string) {
  if (!(PF_STATUSES as readonly string[]).includes(status)) throw new ValidationError("Status inválido.");
  const j = await load(actor, clientId);
  const s = status as PfStatus;
  if ((s === "ATIVO_APLICATIVO" || s === "ATIVO_ACOMPANHAMENTO") && !j.continuity) throw new ValidationError("Defina a continuidade (opção A ou B) antes de ativar o cliente.");
  await prisma.$transaction(async (tx) => {
    await tx.pfJourney.update({ where: { id: j.id }, data: { status: s } });
    await log(tx, actor, j.id, clientId, `status: ${PF_STATUS_LABEL[j.status as PfStatus]} → ${PF_STATUS_LABEL[s]}`);
  });
}

export async function setPfContinuity(actor: Actor, clientId: string, value: string) {
  if (!(PF_CONTINUITY as readonly string[]).includes(value)) throw new ValidationError("Opção de continuidade inválida.");
  const j = await load(actor, clientId);
  const c = value as PfContinuity;
  const status = statusForContinuity(c);
  await prisma.$transaction(async (tx) => {
    await tx.pfJourney.update({ where: { id: j.id }, data: { continuity: c, status } });
    await log(tx, actor, j.id, clientId, `continuidade definida: ${c === "SEGUIR_SOZINHO" ? "opção A (seguir sozinho)" : "opção B (acompanhamento mensal)"}`);
  });
}

/** Marca/desmarca um item do checklist. Concluir o último item da etapa avança o status. */
export async function togglePfItem(actor: Actor, clientId: string, key: string) {
  const valid = PF_STAGES.some((s) => s.items.some((_, i) => itemKey(s.n, i) === key));
  if (!valid) throw new ValidationError("Item inválido.");
  const j = await load(actor, clientId);
  const done = new Set(j.doneItems);
  const wasDone = done.has(key);
  if (wasDone) done.delete(key); else done.add(key);
  const stage = PF_STAGES.find((s) => s.n === Number(key.split(".")[0]))!;
  const stageDone = stage.items.every((_, i) => done.has(itemKey(stage.n, i)));
  const advance = !wasDone && stageDone && stage.n <= 8 && PF_STATUSES.indexOf(stage.doneStatus) > PF_STATUSES.indexOf(j.status as PfStatus);
  await prisma.$transaction(async (tx) => {
    await tx.pfJourney.update({ where: { id: j.id }, data: { doneItems: [...done], ...(advance ? { status: stage.doneStatus } : {}) } });
    await log(tx, actor, j.id, clientId, `${wasDone ? "reaberto" : "concluído"}: ${stage.name}, item ${Number(key.split(".")[1]) + 1}${advance ? ` — status: ${PF_STATUS_LABEL[stage.doneStatus]}` : ""}`);
  });
}

/** Lista para a página ROSAN LIFE. */
export async function listPfClients(actor: Actor) {
  assertCan(actor, "clients.manage");
  const clients = await prisma.client.findMany({
    where: { organizationId: actor.organizationId, archivedAt: null, serviceLines: { has: "CONSULTORIA_PF" }, ...(actor.role === "ADMIN" ? {} : { members: { some: { userId: actor.userId } } }) },
    select: { id: true, tradeName: true, contactEmail: true, contactName: true, pfJourney: true },
    orderBy: { tradeName: "asc" },
  });
  return clients.map((c) => {
    const j = c.pfJourney;
    const dl = pfDeadlines({ startDate: iso(j?.startDate ?? null), appBonusStart: iso(j?.appBonusStart ?? null) });
    return { id: c.id, name: c.tradeName, email: c.contactEmail, status: (j?.status ?? "NOVO_INTERESSADO") as PfStatus, startDate: iso(j?.startDate ?? null), endDate: dl.endDate, appBonusEnd: dl.appBonusEnd, appInvitedAt: j?.appInvitedAt ?? null, paid: !!j?.paidAt };
  });
}
