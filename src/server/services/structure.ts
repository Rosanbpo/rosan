import { SYSTEM_MESSAGES } from "@/domain/crm-messages";
import { ESTEIRAS } from "@/domain/esteiras";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { listAssets } from "./journey";

export type ReviewStatus = "VALIDADO" | "AJUSTAR" | "PENDENTE";
export interface StructureItem { key: string; title: string; href: string | null; status: ReviewStatus; note: string | null }
export interface StructureArea { id: string; emoji: string; title: string; hint: string; items: StructureItem[]; validated: number }

/** Itens que a administradora acompanha e que não vivem em outra tabela. */
export const EXTRA_ITEMS: Array<{ key: string; title: string; href: string | null; area: string }> = [
  { key: "extra:slide-apresentacao", title: "Slide de apresentação comercial (apresentar a Rosan ao lead)", href: null, area: "comercial" },
  { key: "extra:slide-onboarding", title: "Slide de onboarding (apresentar o processo ao cliente novo)", href: null, area: "comercial" },
  { key: "extra:precificacao", title: "Precificação calibrada com os custos e a margem reais", href: "/precificacao", area: "comercial" },
  { key: "extra:proposta", title: "Modelo de proposta revisado", href: "/propostas", area: "comercial" },
  { key: "extra:contrato", title: "Modelo de contrato revisado pelo advogado", href: "/contratos", area: "comercial" },
  { key: "extra:diagnostico", title: "Diagnóstico do cliente (perguntas e texto)", href: "/clientes", area: "comercial" },
  { key: "extra:trilha", title: "Trilha de conhecimento da equipe nova", href: "/biblioteca?secao=trilha", area: "equipe" },
  { key: "extra:acessos", title: "Quem vê o quê na biblioteca (por pessoa)", href: "/biblioteca?secao=acessos", area: "equipe" },
];

export async function structureOverview(actor: Actor): Promise<StructureArea[]> {
  assertCan(actor, "templates.manage");
  const org = actor.organizationId;
  const [reviews, templates, pops, assets, culture, custom] = await Promise.all([
    prisma.structureReview.findMany({ where: { organizationId: org } }),
    prisma.routineTemplate.findMany({ where: { organizationId: org, exclusiveClientId: null, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.procedure.findMany({ where: { organizationId: org, clientId: null, status: { not: "ARQUIVADO" } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    listAssets(actor),
    prisma.companyCulture.findFirst({ where: { organizationId: org } }),
    prisma.esteiraCustom.findMany({ where: { organizationId: org }, select: { slug: true } }),
  ]);
  const by = new Map(reviews.map((r) => [r.key, r]));
  const item = (key: string, title: string, href: string | null): StructureItem => {
    const r = by.get(key);
    return { key, title, href, status: (r?.status as ReviewStatus) ?? "PENDENTE", note: r?.note ?? null };
  };
  const customSlugs = new Set(custom.map((c) => c.slug));
  const areas: Omit<StructureArea, "validated">[] = [
    {
      id: "jornada", emoji: "🧭", title: "Jornada do cliente", hint: "Esteiras (etapas, tarefas, prazos e checklists) e modelos de rotina.",
      items: [
        ...ESTEIRAS.map((e) => item(`esteira:${e.slug}`, `Esteira: ${e.name}${customSlugs.has(e.slug) ? " (editada)" : ""}`, "/biblioteca?secao=jornada")),
        ...templates.map((t) => item(`rotina:${t.id}`, `Rotina: ${t.name}`, `/rotinas/modelos/${t.id}`)),
        item("checklist:closing", "Checklist de fechamento mensal", "/configuracoes/checklists"),
      ],
    },
    {
      id: "padroes", emoji: "🗂️", title: "Mensagens, e-mails e documentos", hint: "Os textos padrão que aparecem nas tarefas e no CRM.",
      items: [
        ...assets.map((a) => item(`asset:${a.id}`, `${a.kind === "EMAIL" ? "E-mail" : a.kind === "DOCUMENTO" ? "Documento" : "Mensagem"}: ${a.title}`, "/biblioteca?secao=jornada")),
        ...SYSTEM_MESSAGES.map((m) => item(`msg:${m.id}`, `CRM: ${m.title.replace(/^\S+\s/, "")}`, "/biblioteca?secao=mensagens")),
      ],
    },
    { id: "pops", emoji: "📖", title: "Processos (POPs)", hint: "Passo a passo de como a Rosan trabalha.", items: pops.map((p) => item(`pop:${p.id}`, p.title, `/pops/${p.id}`)) },
    {
      id: "comercial", emoji: "💼", title: "Comercial e apresentação", hint: "Slides, precificação, proposta, contrato e diagnóstico.",
      items: EXTRA_ITEMS.filter((x) => x.area === "comercial").map((x) => item(x.key, x.title, x.href)),
    },
    {
      id: "equipe", emoji: "🎓", title: "Cultura e equipe", hint: "Missão, visão, valores, trilha e acessos.",
      items: [
        item("cultura", culture?.mission || culture?.vision ? "Missão, visão e valores" : "Missão, visão e valores (ainda não preenchidos)", "/cultura"),
        ...EXTRA_ITEMS.filter((x) => x.area === "equipe").map((x) => item(x.key, x.title, x.href)),
      ],
    },
  ];
  return areas.map((a) => ({ ...a, validated: a.items.filter((i) => i.status === "VALIDADO").length }));
}

export async function setReview(actor: Actor, key: string, status: string, note?: string) {
  assertCan(actor, "templates.manage");
  if (!/^[a-z]+(:[\w-]+)?$/i.test(key) || key.length > 120) throw new ValidationError("Item inválido.");
  if (status === "PENDENTE") {
    await prisma.structureReview.deleteMany({ where: { organizationId: actor.organizationId, key } });
    return;
  }
  if (status !== "VALIDADO" && status !== "AJUSTAR") throw new ValidationError("Status inválido.");
  const n = (note ?? "").trim().slice(0, 500) || null;
  await prisma.structureReview.upsert({
    where: { organizationId_key: { organizationId: actor.organizationId, key } },
    create: { organizationId: actor.organizationId, key, status, note: n },
    update: { status, note: n },
  });
}
