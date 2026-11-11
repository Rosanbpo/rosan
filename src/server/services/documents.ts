import { assertCan, ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { DEFAULT_DOCUMENTS, isCompetence } from "@/domain/documents";
import { prisma } from "../db";
import { assertClientAccess, clientScope } from "./access";
import { recordAudit } from "./audit";

function checkCompetence(competence: string) {
  if (!isCompetence(competence)) throw new ValidationError("Competência inválida.", { competence: "Use o formato AAAA-MM." });
}

/** Lista de documentos esperados do cliente, com o recebimento da competência. */
export async function getDocumentChecklist(actor: Actor, clientId: string, competence: string) {
  await assertClientAccess(actor, clientId);
  checkCompetence(competence);
  const rows = await prisma.documentRequirement.findMany({
    where: { clientId, organizationId: actor.organizationId, archivedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      receipts: { where: { competence }, include: { receivedBy: { select: { name: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    required: r.required,
    receivedAt: r.receipts[0]?.receivedAt ?? null,
    receivedBy: r.receipts[0]?.receivedBy?.name ?? null,
  }));
}

function canConfigure(actor: Actor) {
  assertCan(actor, "clients.manage");
}

export async function addRequirement(actor: Actor, clientId: string, name: string, required: boolean) {
  canConfigure(actor);
  await assertClientAccess(actor, clientId);
  const clean = name.trim();
  if (!clean) throw new ValidationError("Informe o nome do documento.", { name: "Informe o nome." });
  if (clean.length > 150) throw new ValidationError("Nome muito longo.", { name: "Máximo de 150 caracteres." });
  const dup = await prisma.documentRequirement.findFirst({
    where: { clientId, archivedAt: null, name: { equals: clean, mode: "insensitive" } },
  });
  if (dup) throw new ValidationError("Este documento já está na lista.", { name: "Já existe." });
  const last = await prisma.documentRequirement.aggregate({ where: { clientId }, _max: { position: true } });
  return prisma.documentRequirement.create({
    data: { organizationId: actor.organizationId, clientId, name: clean, required, position: (last._max.position ?? -1) + 1 },
  });
}

/** Acrescenta a lista padrão sem duplicar o que o cliente já tem. */
export async function applyDefaultRequirements(actor: Actor, clientId: string) {
  canConfigure(actor);
  await assertClientAccess(actor, clientId);
  const existing = await prisma.documentRequirement.findMany({ where: { clientId, archivedAt: null }, select: { name: true, position: true } });
  const names = new Set(existing.map((e) => e.name.toLowerCase()));
  let position = Math.max(-1, ...existing.map((e) => e.position)) + 1;
  const toCreate = DEFAULT_DOCUMENTS.filter((d) => !names.has(d.name.toLowerCase()));
  if (toCreate.length) {
    await prisma.documentRequirement.createMany({
      data: toCreate.map((d) => ({ organizationId: actor.organizationId, clientId, name: d.name, required: d.required, position: position++ })),
    });
  }
  return toCreate.length;
}

async function loadRequirement(actor: Actor, id: string) {
  const req = await prisma.documentRequirement.findFirst({ where: { id, organizationId: actor.organizationId, archivedAt: null } });
  if (!req) throw new NotFoundError("Documento não encontrado.");
  await assertClientAccess(actor, req.clientId);
  return req;
}

export async function removeRequirement(actor: Actor, id: string) {
  canConfigure(actor);
  const req = await loadRequirement(actor, id);
  await prisma.documentRequirement.update({ where: { id: req.id }, data: { archivedAt: new Date() } });
}

/** Marca (ou desmarca) o documento como recebido na competência. */
export async function setReceived(actor: Actor, requirementId: string, competence: string, received: boolean) {
  checkCompetence(competence);
  const req = await loadRequirement(actor, requirementId);
  await prisma.$transaction(async (tx) => {
    if (received) {
      await tx.documentReceipt.upsert({
        where: { requirementId_competence: { requirementId, competence } },
        create: { requirementId, competence, receivedById: actor.userId },
        update: {},
      });
    } else {
      await tx.documentReceipt.deleteMany({ where: { requirementId, competence } });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: req.clientId,
      clientId: req.clientId,
      action: received ? "document.received" : "document.unreceived",
      summary: `${received ? "Recebido" : "Recebimento desfeito"}: ${req.name} (${competence})`,
    });
  });
}

/** Visão da carteira: quantos documentos obrigatórios cada cliente já enviou na competência. */
export async function documentsOverview(actor: Actor, competence: string) {
  if (!actor.organizationId) throw new ForbiddenError();
  checkCompetence(competence);
  const clients = await prisma.client.findMany({
    where: { ...clientScope(actor), archivedAt: null, status: { not: "ENCERRADO" } },
    orderBy: { tradeName: "asc" },
    select: {
      id: true,
      tradeName: true,
      documentRequirements: {
        where: { archivedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, required: true, receipts: { where: { competence }, select: { id: true } } },
      },
    },
  });
  return clients.map((c) => {
    const required = c.documentRequirements.filter((d) => d.required);
    const missing = required.filter((d) => d.receipts.length === 0).map((d) => d.name);
    return {
      id: c.id,
      tradeName: c.tradeName,
      configured: c.documentRequirements.length > 0,
      requiredCount: required.length,
      receivedCount: required.length - missing.length,
      missing,
    };
  });
}
