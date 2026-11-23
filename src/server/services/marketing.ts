import { z } from "zod";
import { LIBRARY_IDEAS, LIBRARY_POSTS } from "@/domain/marketing-library";
import { PILLARS, POST_STATUSES } from "@/domain/marketing";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

const input = z.object({
  title: z.string().trim().min(3, "Dê um título à ideia.").max(160),
  pillar: z.enum(PILLARS),
  status: z.enum(POST_STATUSES),
  slidesText: z.string().max(12000).default(""),
  caption: z.string().max(4000).default(""),
  hashtags: z.string().max(1000).default(""),
  notes: z.string().max(2000).default(""),
  publishOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
});
export type MarketingInput = z.input<typeof input>;

function parse(raw: unknown) {
  const r = input.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Dados inválidos.");
  const d = r.data;
  return { ...d, publishOn: d.publishOn ? new Date(`${d.publishOn}T12:00:00Z`) : null };
}

export async function listIdeas(actor: Actor) {
  assertCan(actor, "crm.manage");
  return prisma.marketingIdea.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, title: true, pillar: true, status: true, slidesText: true, publishOn: true, updatedAt: true },
  });
}

export async function getIdea(actor: Actor, id: string) {
  assertCan(actor, "crm.manage");
  const row = await prisma.marketingIdea.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!row) throw new NotFoundError("Conteúdo não encontrado.");
  return row;
}

export async function createIdea(actor: Actor, raw: MarketingInput) {
  assertCan(actor, "crm.manage");
  const d = parse(raw);
  return prisma.marketingIdea.create({ data: { ...d, organizationId: actor.organizationId } });
}

export async function updateIdea(actor: Actor, id: string, raw: MarketingInput) {
  await getIdea(actor, id);
  await prisma.marketingIdea.update({ where: { id }, data: parse(raw) });
}

export async function setIdeaStatus(actor: Actor, id: string, status: string) {
  await getIdea(actor, id);
  if (!(POST_STATUSES as readonly string[]).includes(status)) throw new ValidationError("Status inválido.");
  await prisma.marketingIdea.update({ where: { id }, data: { status } });
}

export async function deleteIdea(actor: Actor, id: string) {
  await getIdea(actor, id);
  await prisma.marketingIdea.delete({ where: { id } });
}

/** Importa os carrosséis prontos e as ideias da biblioteca, sem duplicar o que já foi importado. */
export async function importLibrary(actor: Actor) {
  assertCan(actor, "crm.manage");
  const orgId = actor.organizationId;
  const have = new Set((await prisma.marketingIdea.findMany({ where: { organizationId: orgId, libraryKey: { not: null } }, select: { libraryKey: true } })).map((r) => r.libraryKey));
  let added = 0;
  for (const p of LIBRARY_POSTS) {
    if (have.has(p.key)) continue;
    await prisma.marketingIdea.create({ data: { organizationId: orgId, libraryKey: p.key, title: p.title, pillar: p.pillar, status: "PRONTO", slidesText: p.slidesText, caption: p.caption, hashtags: p.hashtags } });
    added++;
  }
  for (const [i, idea] of LIBRARY_IDEAS.entries()) {
    const key = `ideia-${i + 1}`;
    if (have.has(key)) continue;
    await prisma.marketingIdea.create({ data: { organizationId: orgId, libraryKey: key, title: idea.title, pillar: idea.pillar, status: "IDEIA", notes: idea.notes } });
    added++;
  }
  return added;
}
