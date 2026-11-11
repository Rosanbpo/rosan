import { Prisma } from "@prisma/client";
import { dbDateToLocalDate, instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { STAGES_BEFORE_PROPOSAL, nextProposalNumber, type ProposalStatus } from "@/domain/proposal";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { parseInput, proposalSchema } from "../validation";
import { recordAudit } from "./audit";

const today = () => instantToLocalDate(new Date(), APP_TIMEZONE);

function shape<T extends { monthlyFee: Prisma.Decimal; validUntil: Date }>(p: T) {
  return { ...p, monthlyFee: Number(p.monthlyFee), validUntilLocal: dbDateToLocalDate(p.validUntil) };
}

export async function listProposals(actor: Actor, filters: { status?: ProposalStatus; q?: string } = {}) {
  assertCan(actor, "crm.manage");
  const rows = await prisma.proposal.findMany({
    where: {
      organizationId: actor.organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { OR: [{ companyName: { contains: filters.q, mode: "insensitive" } }, { number: { contains: filters.q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, companyName: true, planName: true, monthlyFee: true, validUntil: true, status: true, createdAt: true },
  });
  return rows.map(shape);
}

export async function getProposal(actor: Actor, id: string) {
  assertCan(actor, "crm.manage");
  const row = await prisma.proposal.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: { lead: { select: { id: true, companyName: true } }, createdBy: { select: { name: true } } },
  });
  if (!row) throw new NotFoundError("Proposta não encontrada.");
  return shape(row);
}

/** Dados para montar o documento: proposta + perfil da empresa emissora. */
export async function getProposalDocument(actor: Actor, id: string) {
  const [proposal, org] = await Promise.all([
    getProposal(actor, id),
    prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: { name: true, legalName: true, cnpj: true, email: true, phone: true, website: true, city: true },
    }),
  ]);
  return { proposal, org };
}

export async function proposalsOfLead(actor: Actor, leadId: string) {
  assertCan(actor, "crm.manage");
  const rows = await prisma.proposal.findMany({
    where: { organizationId: actor.organizationId, leadId },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, planName: true, monthlyFee: true, validUntil: true, status: true },
  });
  return rows.map(shape);
}

async function assertLead(actor: Actor, leadId?: string) {
  if (!leadId) return;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: actor.organizationId } });
  if (!lead) throw new ValidationError("Lead não encontrado.");
}

function toData(input: ReturnType<typeof proposalSchema.parse>) {
  return {
    leadId: input.leadId ?? null,
    planName: input.planName,
    companyName: input.companyName,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    intro: input.intro ?? null,
    services: input.services,
    volumes: input.volumes,
    exclusions: input.exclusions,
    monthlyFee: input.monthlyFee,
    billingDay: input.billingDay,
    termMonths: input.termMonths,
    validUntil: localDateToDbDate(input.validUntil),
    notes: input.notes ?? null,
  };
}

export async function createProposal(actor: Actor, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(proposalSchema, raw);
  await assertLead(actor, input.leadId);
  const year = Number(today().slice(0, 4));

  // O número é sequencial por ano; em caso de disputa pelo mesmo número, tenta de novo.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const last = await tx.proposal.findFirst({
          where: { organizationId: actor.organizationId, number: { startsWith: `${year}-` } },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const proposal = await tx.proposal.create({
          data: { organizationId: actor.organizationId, createdById: actor.userId, number: nextProposalNumber(year, last?.number ?? null), ...toData(input) },
        });
        await recordAudit(tx, {
          organizationId: actor.organizationId,
          actorId: actor.userId,
          entityType: "Lead",
          entityId: input.leadId ?? proposal.id,
          action: "proposal.created",
          summary: `Proposta ${proposal.number} criada para ${proposal.companyName}`,
        });
        return proposal;
      });
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!conflict || attempt === 3) throw error;
    }
  }
  throw new Error("Não foi possível gerar o número da proposta.");
}

export async function updateProposal(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "crm.manage");
  const input = parseInput(proposalSchema, raw);
  const current = await getProposal(actor, id);
  if (current.status === "ACEITA") throw new ValidationError("Propostas aceitas não podem ser alteradas. Crie uma nova proposta.");
  await assertLead(actor, input.leadId);
  await prisma.proposal.update({ where: { id }, data: toData(input) });
}

export async function setProposalStatus(actor: Actor, id: string, status: ProposalStatus) {
  assertCan(actor, "crm.manage");
  const current = await getProposal(actor, id);
  if (current.status === status) return;
  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id },
      data: { status, ...(status === "ENVIADA" ? { sentAt: new Date() } : {}) },
    });
    // Enviar a proposta leva o lead (se ainda no início do funil) para "Proposta enviada".
    if (status === "ENVIADA" && current.leadId) {
      const lead = await tx.lead.findUnique({ where: { id: current.leadId } });
      if (lead && (STAGES_BEFORE_PROPOSAL as readonly string[]).includes(lead.stage)) {
        await tx.lead.update({ where: { id: lead.id }, data: { stage: "PROPOSTA" } });
        await tx.leadActivity.create({
          data: { leadId: lead.id, authorId: actor.userId, kind: "ETAPA", body: `Proposta ${current.number} enviada — etapa alterada para PROPOSTA` },
        });
      }
    }
  });
}
