import { assertCan, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { recordAudit } from "./audit";

/**
 * Cópia dos dados da empresa em JSON. Nunca inclui senhas de login, segredos de duas etapas
 * nem as senhas do cofre (só o cadastro dos itens, sem o segredo).
 */
export async function exportOrganizationData(actor: Actor) {
  assertCan(actor, "org.settings");
  const where = { organizationId: actor.organizationId };
  const [org, users, clients, bankAccounts, tasks, procedures, notes, vault, leads, proposals, contracts, projects, pendings, templates, recurrences, timeEntries, documents, reminders, marketing, marketingBrand] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } }),
    prisma.membership.findMany({ where, select: { role: true, active: true, user: { select: { id: true, name: true, email: true } } } }),
    prisma.client.findMany({ where, include: { members: { select: { userId: true } } } }),
    prisma.clientBankAccount.findMany({ where: { client: where } }),
    prisma.task.findMany({ where, include: { checklistItems: true, comments: true } }),
    prisma.procedure.findMany({ where }),
    prisma.clientNote.findMany({ where }),
    prisma.clientVaultItem.findMany({ where, select: { id: true, clientId: true, category: true, label: true, url: true, username: true, notes: true, createdAt: true } }),
    prisma.lead.findMany({ where, include: { activities: true } }),
    prisma.proposal.findMany({ where }),
    prisma.contract.findMany({ where }),
    prisma.project.findMany({ where }),
    prisma.pending.findMany({ where }),
    prisma.routineTemplate.findMany({ where, include: { checklistItems: true } }),
    prisma.recurrence.findMany({ where }),
    prisma.timeEntry.findMany({ where }),
    prisma.documentRequirement.findMany({ where, include: { receipts: true } }),
    prisma.clientReminder.findMany({ where }),
    prisma.marketingIdea.findMany({ where }),
    prisma.marketingBrand.findMany({ where }),
  ]);
  await prisma.$transaction((tx) =>
    recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Organization", entityId: actor.organizationId, action: "backup.exported", summary: "Cópia dos dados exportada" }),
  );
  return {
    geradoEm: new Date().toISOString(),
    aviso: "Não inclui senhas de login, segredos de duas etapas nem as senhas do cofre.",
    empresa: org,
    usuarios: users,
    clientes: clients,
    contasBancarias: bankAccounts,
    tarefas: tasks,
    pops: procedures,
    particularidadesEAtas: notes,
    cofreCadastro: vault,
    leads,
    propostas: proposals,
    contratos: contracts,
    projetos: projects,
    pendencias: pendings,
    modelosDeRotina: templates,
    recorrencias: recurrences,
    horas: timeEntries,
    documentos: documents,
    lembretesDosClientes: reminders,
    conteudosDeMarketing: marketing,
    identidadeVisual: marketingBrand,
  };
}
