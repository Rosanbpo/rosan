import type { Prisma } from "@prisma/client";
import { dbDateToLocalDate, localDateToDbDate } from "@/domain/dates";
import { conversionRate, weightedForecast } from "@/domain/crm";
import { LEAD_STAGES, type LeadStage } from "@/domain/enums";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { leadActivitySchema, leadSchema, leadStageSchema, parseInput } from "../validation";
import { recordAudit } from "./audit";

function toData(input: ReturnType<typeof leadSchema.parse>) {
  return {
    companyName: input.companyName,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    cnpj: input.cnpj ?? null,
    source: input.source ?? null,
    expectedFee: input.expectedFee ?? null,
    servicesInterest: input.servicesInterest,
    ownerId: input.ownerId ?? null,
    nextActionAt: input.nextActionAt ? localDateToDbDate(input.nextActionAt) : null,
    nextAction: input.nextAction ?? null,
    notes: input.notes ?? null,
  };
}

async function assertOwnerInOrg(actor: Actor, ownerId?: string | null) {
  if (!ownerId) return;
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: ownerId, organizationId: actor.organizationId } },
  });
  if (!m || !m.active) throw new ValidationError("O responsável não pertence à empresa.", { ownerId: "Selecione um responsável." });
}

export interface LeadFilters {
  q?: string;
  ownerId?: string;
}

export async function listLeads(actor: Actor, filters: LeadFilters = {}) {
  assertCan(actor, "crm.manage");
  const where: Prisma.LeadWhereInput = {
    organizationId: actor.organizationId,
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    ...(filters.q
      ? {
          OR: [
            { companyName: { contains: filters.q, mode: "insensitive" } },
            { contactName: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.lead.findMany({
    where,
    orderBy: [{ nextActionAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: { owner: { select: { id: true, name: true } } },
  });
  const leads = rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    contactName: r.contactName,
    stage: r.stage as LeadStage,
    expectedFee: r.expectedFee === null ? null : Number(r.expectedFee),
    ownerName: r.owner?.name ?? null,
    nextAction: r.nextAction,
    nextActionAt: r.nextActionAt ? dbDateToLocalDate(r.nextActionAt) : null,
    source: r.source,
    closedAt: r.closedAt,
  }));
  const forecast = weightedForecast(leads);
  const won = leads.filter((l) => l.stage === "GANHO").length;
  const lost = leads.filter((l) => l.stage === "PERDIDO").length;
  return { leads, forecast, conversion: conversionRate(won, lost), won, lost };
}

export async function getLead(actor: Actor, id: string) {
  assertCan(actor, "crm.manage");
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      owner: { select: { id: true, name: true } },
      convertedClient: { select: { id: true, tradeName: true } },
      activities: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!lead) throw new NotFoundError("Lead não encontrado.");
  return lead;
}

export async function createLead(actor: Actor, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(leadSchema, raw);
  await assertOwnerInOrg(actor, input.ownerId);
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: { organizationId: actor.organizationId, ...toData(input), ownerId: input.ownerId ?? actor.userId },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Lead",
      entityId: lead.id,
      action: "lead.created",
      summary: `Lead criado: ${lead.companyName}`,
    });
    return lead;
  });
}

export async function updateLead(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(leadSchema, raw);
  await getLead(actor, id);
  await assertOwnerInOrg(actor, input.ownerId);
  await prisma.lead.update({ where: { id }, data: toData(input) });
}

export async function changeLeadStage(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(leadStageSchema, raw);
  const lead = await getLead(actor, id);
  if (lead.convertedClientId && input.stage !== "GANHO") {
    throw new ValidationError("Este lead já virou cliente e não pode voltar no funil.");
  }
  if (input.stage === "PERDIDO" && !input.lostReason) {
    throw new ValidationError("Informe o motivo da perda.", { lostReason: "Informe o motivo." });
  }
  if (lead.stage === input.stage) return;
  const closing = input.stage === "GANHO" || input.stage === "PERDIDO";
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        stage: input.stage,
        closedAt: closing ? new Date() : null,
        lostReason: input.stage === "PERDIDO" ? (input.lostReason ?? null) : null,
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId: id,
        authorId: actor.userId,
        kind: "ETAPA",
        body: `Etapa alterada para ${input.stage}${input.lostReason ? ` — ${input.lostReason}` : ""}`,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Lead",
      entityId: id,
      action: "lead.stage",
      summary: `Etapa: ${lead.stage} → ${input.stage}`,
    });
  });
}

export async function addLeadActivity(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(leadActivitySchema, raw);
  await getLead(actor, id);
  await prisma.leadActivity.create({ data: { leadId: id, authorId: actor.userId, kind: input.kind, body: input.body } });
}

/** Transforma o lead ganho em cliente (em implantação), copiando dados e a mensalidade esperada. */
export async function convertLeadToClient(actor: Actor, id: string) {
  assertCan(actor, "crm.manage");
  assertCan(actor, "clients.manage");
  const lead = await getLead(actor, id);
  if (lead.convertedClientId) throw new ValidationError("Este lead já foi convertido em cliente.");
  if (lead.cnpj) {
    const dup = await prisma.client.findFirst({ where: { organizationId: actor.organizationId, cnpj: lead.cnpj } });
    if (dup) throw new ValidationError(`Já existe um cliente com este CNPJ (${dup.tradeName}).`);
  }
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        organizationId: actor.organizationId,
        legalName: lead.companyName,
        tradeName: lead.companyName,
        cnpj: lead.cnpj,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        status: "IMPLANTACAO",
        services: lead.servicesInterest,
        monthlyFee: lead.expectedFee,
        notes: lead.notes,
        managerId: null,
      },
    });
    await tx.lead.update({
      where: { id },
      data: { convertedClientId: client.id, stage: "GANHO", closedAt: lead.closedAt ?? new Date(), lostReason: null },
    });
    await tx.leadActivity.create({
      data: { leadId: id, authorId: actor.userId, kind: "ETAPA", body: `Convertido em cliente: ${client.tradeName}` },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: client.id,
      clientId: client.id,
      action: "client.created_from_lead",
      summary: `Cliente criado a partir do lead ${lead.companyName}`,
    });
    return client;
  });
}

export const STAGES_FOR_BOARD = LEAD_STAGES;
