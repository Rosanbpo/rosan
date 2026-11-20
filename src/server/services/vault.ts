import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { decryptSecret, encryptSecret, vaultConfigured } from "../crypto";
import { parseInput, vaultItemSchema } from "../validation";
import { assertClientAccess, clientScope } from "./access";
import { recordAudit } from "./audit";

/** Cofre do cliente: o segredo nunca sai nas listagens; ver a senha é uma ação auditada. */
export async function listVault(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const rows = await prisma.clientVaultItem.findMany({ where: { organizationId: actor.organizationId, clientId }, orderBy: [{ category: "asc" }, { label: "asc" }] });
  return rows.map(({ secretEnc, ...r }) => ({ ...r, hasSecret: !!secretEnc }));
}

export async function vaultAccessLog(actor: Actor, clientId: string, take = 8) {
  await assertClientAccess(actor, clientId);
  return prisma.auditEvent.findMany({
    where: { organizationId: actor.organizationId, clientId, entityType: "VaultItem" },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, summary: true, createdAt: true, actor: { select: { name: true } } },
  });
}

function needKey() {
  if (!vaultConfigured()) throw new ValidationError("O cofre ainda não foi ativado: falta a chave de criptografia no servidor.", {});
}

export async function createVaultItem(actor: Actor, clientId: string, raw: unknown) {
  assertCan(actor, "clients.manage");
  await assertClientAccess(actor, clientId);
  const input = parseInput(vaultItemSchema, raw);
  if (input.secret) needKey();
  return prisma.$transaction(async (tx) => {
    const row = await tx.clientVaultItem.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        category: input.category,
        label: input.label,
        url: input.url ?? null,
        username: input.username ?? null,
        secretEnc: input.secret ? encryptSecret(input.secret) : null,
        notes: input.notes ?? null,
        createdById: actor.userId,
      },
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "VaultItem", entityId: row.id, clientId, action: "vault.created", summary: `Acesso guardado no cofre: ${row.label}` });
    return row;
  });
}

async function loadItem(actor: Actor, itemId: string) {
  const row = await prisma.clientVaultItem.findFirst({ where: { id: itemId, organizationId: actor.organizationId } });
  if (!row) throw new NotFoundError("Item não encontrado.");
  await assertClientAccess(actor, row.clientId);
  return row;
}

/** Revela o segredo. Sempre registra quem viu e quando. */
export async function revealVaultSecret(actor: Actor, itemId: string) {
  const row = await loadItem(actor, itemId);
  if (!row.secretEnc) throw new NotFoundError("Este item não tem senha guardada.");
  needKey();
  const secret = decryptSecret(row.secretEnc);
  await prisma.$transaction((tx) =>
    recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "VaultItem", entityId: row.id, clientId: row.clientId, action: "vault.revealed", summary: `Senha visualizada: ${row.label}` }),
  );
  return { secret, username: row.username };
}

export async function deleteVaultItem(actor: Actor, itemId: string) {
  assertCan(actor, "clients.manage");
  const row = await loadItem(actor, itemId);
  await prisma.$transaction(async (tx) => {
    await tx.clientVaultItem.delete({ where: { id: itemId } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "VaultItem", entityId: row.id, clientId: row.clientId, action: "vault.deleted", summary: `Acesso removido do cofre: ${row.label}` });
  });
  return row;
}

/** Cofre de todos os clientes que a pessoa pode ver, com busca. Nunca devolve o segredo. */
export async function listAllVault(actor: Actor, filters: { q?: string; category?: string; clientId?: string } = {}) {
  const rows = await prisma.clientVaultItem.findMany({
    where: {
      organizationId: actor.organizationId,
      client: clientScope(actor),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.category ? { category: filters.category as never } : {}),
      ...(filters.q ? { OR: [{ label: { contains: filters.q, mode: "insensitive" } }, { username: { contains: filters.q, mode: "insensitive" } }, { url: { contains: filters.q, mode: "insensitive" } }, { client: { tradeName: { contains: filters.q, mode: "insensitive" } } }] } : {}),
    },
    orderBy: [{ client: { tradeName: "asc" } }, { label: "asc" }],
    include: { client: { select: { id: true, tradeName: true } } },
  });
  return rows.map(({ secretEnc, ...r }) => ({ ...r, hasSecret: !!secretEnc }));
}
