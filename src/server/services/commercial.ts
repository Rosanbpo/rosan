import { assertCan, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { clientScope } from "./access";

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Resumo de toda a parte comercial: leads, diagnósticos, propostas e contratos. */
export async function commercialSummary(actor: Actor) {
  assertCan(actor, "crm.manage");
  const org = actor.organizationId;
  const now = new Date();

  const [leads, diagnoses, proposals, contracts, links] = await Promise.all([
    prisma.lead.findMany({ where: { organizationId: org }, select: { id: true, stage: true, expectedFee: true, createdAt: true, closedAt: true } }),
    prisma.clientDiagnosis.findMany({
      where: { organizationId: org, client: { ...clientScope(actor), archivedAt: null } },
      select: { clientId: true, token: true, tokenCreatedAt: true, submittedAt: true, source: true, viewedAt: true, client: { select: { tradeName: true } } },
    }),
    prisma.proposal.findMany({
      where: { organizationId: org },
      select: { id: true, status: true, monthlyFee: true, sentAt: true, updatedAt: true },
    }),
    prisma.contract.findMany({
      where: { organizationId: org },
      select: { id: true, status: true, monthlyFee: true, signDate: true },
    }),
    prisma.contractSignLink.findMany({
      where: { organizationId: org },
      select: { contractId: true, status: true, expiresAt: true },
    }),
  ]);

  // Funil
  const open = leads.filter((l) => l.stage !== "GANHO" && l.stage !== "PERDIDO");
  const stages = (["NOVO", "CONTATO", "REUNIAO", "PROPOSTA", "NEGOCIACAO", "GANHO", "PERDIDO"] as const).map((s) => ({
    stage: s,
    count: leads.filter((l) => l.stage === s).length,
    fee: leads.filter((l) => l.stage === s).reduce((a, l) => a + num(l.expectedFee), 0),
  }));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsMonth = leads.filter((l) => l.createdAt >= monthStart).length;
  const wonMonth = leads.filter((l) => l.stage === "GANHO" && l.closedAt && l.closedAt >= monthStart).length;

  // Diagnósticos (por cliente)
  const sentDx = diagnoses.filter((d) => d.token);
  const answeredDx = diagnoses.filter((d) => d.source === "CLIENTE" && d.submittedAt);
  const waitingDx = diagnoses.filter((d) => d.token && !d.submittedAt);

  // Propostas
  const by = (s: string) => proposals.filter((p) => p.status === s);
  const sum = (list: { monthlyFee: unknown }[]) => list.reduce((a, p) => a + num(p.monthlyFee), 0);

  // Contratos: com link de assinatura = enviado
  const linkOf = (id: string) => links.filter((l) => l.contractId === id);
  const draft = contracts.filter((c) => c.status === "RASCUNHO");
  const awaiting = draft.filter((c) => linkOf(c.id).some((l) => l.status === "PENDENTE" && l.expiresAt > now));
  const expired = draft.filter((c) => !awaiting.includes(c) && linkOf(c.id).some((l) => l.status === "PENDENTE" && l.expiresAt <= now));
  const notSent = draft.filter((c) => !awaiting.includes(c) && !expired.includes(c));
  const signed = contracts.filter((c) => c.status === "ASSINADO");
  const sentContracts = awaiting.length + expired.length + signed.length;

  return {
    leads: { open: open.length, openFee: open.reduce((a, l) => a + num(l.expectedFee), 0), month: leadsMonth, wonMonth, stages },
    diagnoses: {
      sent: sentDx.length,
      answered: answeredDx.length,
      waiting: waitingDx.map((d) => ({ clientId: d.clientId, name: d.client.tradeName, since: d.tokenCreatedAt })),
      unseen: answeredDx.filter((d) => !d.viewedAt).length,
    },
    proposals: {
      draft: by("RASCUNHO").length,
      sent: proposals.filter((p) => p.status !== "RASCUNHO").length,
      waiting: by("ENVIADA").length,
      waitingFee: sum(by("ENVIADA")),
      accepted: by("ACEITA").length,
      acceptedFee: sum(by("ACEITA")),
      refused: by("RECUSADA").length,
    },
    contracts: {
      notSent: notSent.length,
      sent: sentContracts,
      awaiting: awaiting.length,
      awaitingFee: sum(awaiting),
      expired: expired.length,
      signed: signed.length,
      signedFee: sum(signed),
    },
  };
}
