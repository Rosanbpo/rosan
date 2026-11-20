import { ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { assertClientAccess } from "./access";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_LOGO_BYTES = 400 * 1024;

export async function saveClientLogo(actor: Actor, clientId: string, file: { type: string; bytes: Uint8Array }) {
  await assertClientAccess(actor, clientId);
  if (!TYPES.includes(file.type)) throw new ValidationError("Use uma imagem PNG, JPG ou WebP.");
  if (file.bytes.length === 0) throw new ValidationError("Arquivo vazio.");
  if (file.bytes.length > MAX_LOGO_BYTES) throw new ValidationError("A logo deve ter até 400 KB.");
  const data = Buffer.from(file.bytes);
  await prisma.clientLogo.upsert({ where: { clientId }, create: { clientId, contentType: file.type, data }, update: { contentType: file.type, data } });
}

export async function removeClientLogo(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  await prisma.clientLogo.deleteMany({ where: { clientId } });
}

export async function getClientLogo(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.clientLogo.findUnique({ where: { clientId } });
}

/** Ids dos clientes (do conjunto dado) que têm logo — para listagens. */
export async function clientsWithLogo(actor: Actor, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await prisma.clientLogo.findMany({ where: { clientId: { in: ids }, client: { organizationId: actor.organizationId } }, select: { clientId: true, updatedAt: true } });
  return new Map(rows.map((r) => [r.clientId, r.updatedAt.getTime()]));
}
