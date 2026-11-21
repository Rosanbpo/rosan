import { notFound } from "next/navigation";
import { z } from "zod";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { DEFAULT_SECTIONS, LIBRARY_SECTION_KEYS, type LibrarySection } from "@/domain/library";
import { SYSTEM_MESSAGES, type MessageTemplate } from "@/domain/crm-messages";
import { describeRule } from "@/domain/recurrence";
import { JOURNEY_STAGES } from "@/domain/enums";
import { prisma } from "../db";
import { listEsteirasFor } from "./esteiras";

export const MATERIAL_CATEGORIES = ["Contratos e propostas", "E-mails e mensagens", "Roteiros de reunião", "Planilhas e modelos", "Documentos e checklists", "Políticas e regras", "Links úteis", "Outros"] as const;

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

// ---- Acesso por pessoa ------------------------------------------------------

/** Áreas da Biblioteca que a pessoa pode ver. Administradora vê tudo. */
export async function allowedSections(actor: Actor): Promise<LibrarySection[]> {
  if (actor.role === "ADMIN") return LIBRARY_SECTION_KEYS;
  const row = await prisma.libraryAccess.findUnique({ where: { userId: actor.userId } });
  if (!row || row.organizationId !== actor.organizationId) return DEFAULT_SECTIONS;
  return row.sections.filter((k): k is LibrarySection => (LIBRARY_SECTION_KEYS as string[]).includes(k));
}

export async function accessMatrix(actor: Actor) {
  assertCan(actor, "users.manage");
  const members = await prisma.membership.findMany({
    where: { organizationId: actor.organizationId, active: true },
    include: { user: { select: { id: true, name: true, libraryAccess: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    role: m.role,
    sections: m.role === "ADMIN" ? LIBRARY_SECTION_KEYS : m.user.libraryAccess ? m.user.libraryAccess.sections : DEFAULT_SECTIONS,
  }));
}

export async function saveAccess(actor: Actor, userId: string, sections: string[]) {
  assertCan(actor, "users.manage");
  const m = await prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: actor.organizationId } } });
  if (!m) throw new NotFoundError("Pessoa não encontrada.");
  const clean = sections.filter((k) => (LIBRARY_SECTION_KEYS as string[]).includes(k));
  await prisma.libraryAccess.upsert({ where: { userId }, create: { userId, organizationId: actor.organizationId, sections: clean }, update: { sections: clean } });
}

// ---- Mensagens ----------------------------------------------------------------

/** Mensagens prontas do sistema com os ajustes da administradora aplicados. */
export async function systemMessagesFor(organizationId: string): Promise<Array<MessageTemplate & { edited: boolean }>> {
  const rows = await prisma.systemMessageOverride.findMany({ where: { organizationId } });
  const by = new Map(rows.map((r) => [r.key, r]));
  return SYSTEM_MESSAGES.map((m) => {
    const o = by.get(m.id);
    return o ? { ...m, title: o.title, body: o.body, edited: true } : { ...m, edited: false };
  });
}

export async function saveSystemMessage(actor: Actor, key: string, raw: { title?: unknown; body?: unknown }) {
  assertCan(actor, "templates.manage");
  if (!SYSTEM_MESSAGES.some((m) => m.id === key)) throw new NotFoundError("Mensagem não encontrada.");
  const title = String(raw.title ?? "").trim().slice(0, 120);
  const body = String(raw.body ?? "").trim().slice(0, 4000);
  if (!title || !body) throw new ValidationError("Informe o título e o texto da mensagem.");
  await prisma.systemMessageOverride.upsert({
    where: { organizationId_key: { organizationId: actor.organizationId, key } },
    create: { organizationId: actor.organizationId, key, title, body },
    update: { title, body },
  });
}

export async function resetSystemMessage(actor: Actor, key: string) {
  assertCan(actor, "templates.manage");
  await prisma.systemMessageOverride.deleteMany({ where: { organizationId: actor.organizationId, key } });
}

export async function listSharedMessages(actor: Actor) {
  return prisma.messageTemplate.findMany({ where: { organizationId: actor.organizationId, shared: true }, orderBy: { createdAt: "asc" } });
}

export async function saveSharedMessage(actor: Actor, id: string | null, raw: { title?: unknown; body?: unknown; stage?: unknown }) {
  assertCan(actor, "templates.manage");
  const title = String(raw.title ?? "").trim().slice(0, 120);
  const body = String(raw.body ?? "").trim().slice(0, 4000);
  if (!title || !body) throw new ValidationError("Informe o título e o texto da mensagem.");
  const stage = String(raw.stage ?? "") || null;
  if (id) {
    await prisma.messageTemplate.updateMany({ where: { id, organizationId: actor.organizationId, shared: true }, data: { title, body, stage } });
  } else {
    await prisma.messageTemplate.create({ data: { organizationId: actor.organizationId, authorId: actor.userId, title, body, stage, shared: true } });
  }
}

export async function deleteSharedMessage(actor: Actor, id: string) {
  assertCan(actor, "templates.manage");
  await prisma.messageTemplate.deleteMany({ where: { id, organizationId: actor.organizationId, shared: true } });
}

// ---- Jornada do cliente -----------------------------------------------------

/** Esteiras e modelos de rotina organizados pelas etapas da jornada, com prazos. */
export async function journeyOverview(actor: Actor) {
  const [esteiras, templates] = await Promise.all([
    listEsteirasFor(actor.organizationId),
    prisma.routineTemplate.findMany({
      where: { organizationId: actor.organizationId, exclusiveClientId: null, archivedAt: null },
      orderBy: { name: "asc" },
      include: { checklistItems: { select: { id: true } } },
    }),
  ]);
  return JOURNEY_STAGES.map((stage) => ({
    stage,
    esteiras: esteiras
      .filter((e) => e.stage === stage)
      .map((e) => {
        const tasks = e.stages.flatMap((s) => s.tasks);
        return {
          slug: e.slug,
          name: e.name,
          summary: e.summary,
          custom: e.custom,
          totalDays: tasks.reduce((m, t) => Math.max(m, t.day), 0),
          stages: e.stages.map((s) => ({
            name: s.name,
            from: s.tasks.length ? Math.min(...s.tasks.map((t) => t.day)) : 0,
            to: s.tasks.length ? Math.max(...s.tasks.map((t) => t.day)) : 0,
            tasks: s.tasks.map((t) => ({ title: t.title, day: t.day, minutes: t.minutes, items: t.items.length, description: t.description ?? null })),
          })),
        };
      }),
    templates: templates
      .filter((t) => t.stage === stage)
      .map((t) => ({ id: t.id, name: t.name, items: t.checklistItems.length, minutes: t.estimatedMinutes, rule: describeRule(t) })),
  }));
}

/** Rotinas ainda sem etapa da jornada. */
export async function templatesWithoutStage(actor: Actor) {
  const rows = await prisma.routineTemplate.findMany({ where: { organizationId: actor.organizationId, exclusiveClientId: null, archivedAt: null, stage: null }, orderBy: { name: "asc" }, include: { checklistItems: { select: { id: true } } } });
  return rows.map((t) => ({ id: t.id, name: t.name, items: t.checklistItems.length, minutes: t.estimatedMinutes, rule: describeRule(t) }));
}

/** Bloqueia (404) a página quando a pessoa não tem a área liberada na Biblioteca. */
export async function requireSection(actor: Actor, key: LibrarySection) {
  if (!(await allowedSections(actor)).includes(key)) notFound();
}
