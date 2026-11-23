import { z } from "zod";
import { LIBRARY_IDEAS, LIBRARY_POSTS } from "@/domain/marketing-library";
import { BRAND_STYLES, DEFAULT_BRAND, FONT_KEYS, PILLARS, POST_STATUSES, type BrandSettings } from "@/domain/marketing";
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

// ---------- Identidade visual e fotos ----------


const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use cores no formato #RRGGBB.");
const brandInput = z.object({
  navy: hex,
  gold: hex,
  cream: hex,
  brown: hex,
  titleFont: z.enum(FONT_KEYS as [string, ...string[]]),
  bodyFont: z.enum(FONT_KEYS as [string, ...string[]]),
  style: z.enum(BRAND_STYLES),
  guidelines: z.string().max(3000).default(""),
});

export async function getBrand(actor: Actor): Promise<BrandSettings> {
  assertCan(actor, "crm.manage");
  const row = await prisma.marketingBrand.findUnique({ where: { organizationId: actor.organizationId } });
  if (!row) return { ...DEFAULT_BRAND };
  return {
    navy: row.navy,
    gold: row.gold,
    cream: row.cream,
    brown: row.brown,
    titleFont: (FONT_KEYS.includes(row.titleFont as never) ? row.titleFont : "inter") as BrandSettings["titleFont"],
    bodyFont: (FONT_KEYS.includes(row.bodyFont as never) ? row.bodyFont : "inter") as BrandSettings["bodyFont"],
    style: (BRAND_STYLES.includes(row.style as never) ? row.style : "MINIMALISTA") as BrandSettings["style"],
    guidelines: row.guidelines,
  };
}

export async function saveBrand(actor: Actor, raw: unknown) {
  assertCan(actor, "crm.manage");
  const r = brandInput.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Dados inválidos.");
  const data = { ...r.data, navy: r.data.navy.toUpperCase(), gold: r.data.gold.toUpperCase(), cream: r.data.cream.toUpperCase(), brown: r.data.brown.toUpperCase() };
  await prisma.marketingBrand.upsert({
    where: { organizationId: actor.organizationId },
    create: { ...data, organizationId: actor.organizationId },
    update: data,
  });
}

export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"];

export async function listPhotos(actor: Actor) {
  assertCan(actor, "crm.manage");
  return prisma.marketingPhoto.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, size: true, createdAt: true },
  });
}

export async function addPhoto(actor: Actor, file: { name: string; mime: string; data: Buffer }) {
  assertCan(actor, "crm.manage");
  if (!PHOTO_MIMES.includes(file.mime)) throw new ValidationError("Envie uma foto JPG, PNG ou WebP.");
  if (file.data.length === 0) throw new ValidationError("O arquivo está vazio.");
  if (file.data.length > PHOTO_MAX_BYTES) throw new ValidationError("A foto passa de 3 MB. Envie uma menor.");
  const count = await prisma.marketingPhoto.count({ where: { organizationId: actor.organizationId } });
  if (count >= 60) throw new ValidationError("Limite de 60 fotos. Apague alguma para enviar outra.");
  return prisma.marketingPhoto.create({
    data: { organizationId: actor.organizationId, name: file.name.slice(0, 120) || "foto", mime: file.mime, size: file.data.length, data: new Uint8Array(file.data) },
  });
}

export async function getPhoto(actor: Actor, id: string) {
  assertCan(actor, "crm.manage");
  const row = await prisma.marketingPhoto.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!row) throw new NotFoundError("Foto não encontrada.");
  return row;
}

export async function deletePhoto(actor: Actor, id: string) {
  await getPhoto(actor, id);
  await prisma.marketingIdea.updateMany({ where: { organizationId: actor.organizationId, photoId: id }, data: { photoId: null } });
  await prisma.marketingPhoto.delete({ where: { id } });
}

export async function setIdeaPhoto(actor: Actor, ideaId: string, photoId: string) {
  await getIdea(actor, ideaId);
  if (photoId) await getPhoto(actor, photoId);
  await prisma.marketingIdea.update({ where: { id: ideaId }, data: { photoId: photoId || null } });
}
