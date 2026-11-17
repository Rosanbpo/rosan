import { assertCan, NotFoundError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { bankAccountSchema, parseInput } from "../validation";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

/** Contas bancárias do cliente (apenas identificação; senhas nunca são guardadas aqui). */
export async function listBankAccounts(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.clientBankAccount.findMany({
    where: { clientId, organizationId: actor.organizationId, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function addBankAccount(actor: Actor, clientId: string, raw: unknown) {
  assertCan(actor, "clients.manage");
  await assertClientAccess(actor, clientId);
  const input = parseInput(bankAccountSchema, raw);
  return prisma.$transaction(async (tx) => {
    const acc = await tx.clientBankAccount.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        bank: input.bank,
        agency: input.agency ?? null,
        account: input.account ?? null,
        kind: input.kind ?? null,
        nickname: input.nickname ?? null,
        notes: input.notes ?? null,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: clientId,
      clientId,
      action: "client.bank_added",
      summary: `Conta bancária adicionada: ${input.bank}`,
    });
    return acc;
  });
}

export async function removeBankAccount(actor: Actor, accountId: string) {
  assertCan(actor, "clients.manage");
  const acc = await prisma.clientBankAccount.findFirst({ where: { id: accountId, organizationId: actor.organizationId, archivedAt: null } });
  if (!acc) throw new NotFoundError("Conta não encontrada.");
  await assertClientAccess(actor, acc.clientId);
  await prisma.$transaction(async (tx) => {
    await tx.clientBankAccount.update({ where: { id: accountId }, data: { archivedAt: new Date() } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: acc.clientId,
      clientId: acc.clientId,
      action: "client.bank_removed",
      summary: `Conta bancária removida: ${acc.bank}`,
    });
  });
}
