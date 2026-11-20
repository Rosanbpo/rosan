import { z } from "zod";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

export const MATERIAL_CATEGORIES = ["Contratos e propostas", "E-mails e mensagens", "Roteiros de reunião", "Planilhas e modelos", "Links úteis", "Outros"] as const;

const schema = z.object({
  title: z.string().trim().min(2, "Informe o título.").max(150),
  category: z.enum(MATERIAL_CATEGORIES),
  body: z.string().trim().max(20_000).optional().transform((v) => v || null),
  url: z.string().trim().max(500).optional().transform((v) => v || null).refine((v) => !v || /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://"),
});

export async function listMaterials(actor: Actor, q?: string) {
  const where = { organizationId: actor.organizationId, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { body: { contains: q, mode: "insensitive" as const } }] } : {}) };
  return prisma.material.findMany({ where, orderBy: [{ category: "asc" }, { title: "asc" }] });
}

export async function saveMaterial(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "templates.manage");
  const r = schema.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Confira os dados.");
  if (id) {
    const own = await prisma.material.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!own) throw new NotFoundError("Material não encontrado.");
    await prisma.material.update({ where: { id }, data: r.data });
  } else {
    await prisma.material.create({ data: { ...r.data, organizationId: actor.organizationId, createdById: actor.userId } });
  }
}

export async function deleteMaterial(actor: Actor, id: string) {
  assertCan(actor, "templates.manage");
  await prisma.material.deleteMany({ where: { id, organizationId: actor.organizationId } });
}
