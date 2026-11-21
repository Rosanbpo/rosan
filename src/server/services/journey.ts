import { addDays, localDateTimeToInstant, localDateToDbDate, weekday } from "@/domain/dates";
import { JOURNEY_STAGES, type JourneyStage } from "@/domain/enums";
import { taskKey, type Esteira } from "@/domain/esteiras";
import { ASSET_KINDS, DEFAULT_ASSETS, type AssetKind } from "@/domain/journey-assets";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { applyEsteira, listEsteirasFor } from "./esteiras";

const businessDay = (date: string) => {
  const w = weekday(date);
  return w === 6 ? addDays(date, 2) : w === 0 ? addDays(date, 1) : date;
};
const LEAD_SEP = "@";

// ---- Biblioteca de padrões --------------------------------------------------

/** Cria os textos iniciais na primeira vez que a empresa abre a jornada. */
async function ensureAssets(organizationId: string) {
  if ((await prisma.journeyAsset.count({ where: { organizationId } })) > 0) return;
  await prisma.journeyAsset.createMany({
    data: DEFAULT_ASSETS.map((a, position) => ({
      organizationId, kind: a.kind, title: a.title, subject: a.subject ?? null, body: a.body, stage: a.stage, taskRefs: a.refs, position,
    })),
  });
}

export async function listAssets(actor: Actor) {
  await ensureAssets(actor.organizationId);
  const rows = await prisma.journeyAsset.findMany({ where: { organizationId: actor.organizationId }, orderBy: { position: "asc" } });
  return rows.sort((a, b) => JOURNEY_STAGES.indexOf(a.stage as JourneyStage) - JOURNEY_STAGES.indexOf(b.stage as JourneyStage) || a.position - b.position);
}

export async function saveAsset(actor: Actor, id: string | null, raw: Record<string, unknown>) {
  assertCan(actor, "templates.manage");
  const kind = String(raw.kind ?? "") as AssetKind;
  const stage = String(raw.stage ?? "");
  const title = String(raw.title ?? "").trim().slice(0, 150);
  if (!ASSET_KINDS.includes(kind)) throw new ValidationError("Escolha o tipo: mensagem, e-mail ou documento.");
  if (!(JOURNEY_STAGES as readonly string[]).includes(stage)) throw new ValidationError("Escolha a etapa da jornada.");
  if (title.length < 2) throw new ValidationError("Informe o título.");
  const url = String(raw.url ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) throw new ValidationError("O link deve começar com http:// ou https://");
  const refs = (Array.isArray(raw.taskRefs) ? raw.taskRefs : raw.taskRefs ? [raw.taskRefs] : []).map(String).filter((r) => r.includes("|"));
  const data = {
    kind, stage, title,
    subject: String(raw.subject ?? "").trim().slice(0, 200) || null,
    body: String(raw.body ?? "").trim().slice(0, 20_000) || null,
    url: url || null,
    taskRefs: refs,
  };
  if (id) {
    const r = await prisma.journeyAsset.updateMany({ where: { id, organizationId: actor.organizationId }, data });
    if (!r.count) throw new NotFoundError("Item não encontrado.");
  } else {
    const last = await prisma.journeyAsset.aggregate({ where: { organizationId: actor.organizationId }, _max: { position: true } });
    await prisma.journeyAsset.create({ data: { ...data, organizationId: actor.organizationId, position: (last._max.position ?? -1) + 1 } });
  }
}

export async function deleteAsset(actor: Actor, id: string) {
  assertCan(actor, "templates.manage");
  await prisma.journeyAsset.deleteMany({ where: { id, organizationId: actor.organizationId } });
}

/** Todas as tarefas das esteiras (para escolher a quais um item serve). */
export async function journeyTaskOptions(organizationId: string) {
  const list = await listEsteirasFor(organizationId);
  return list.map((e) => ({ slug: e.slug, name: e.name, stage: e.stage, tasks: e.stages.flatMap((s) => s.tasks.map((t) => t.title)) }));
}

type Asset = Awaited<ReturnType<typeof listAssets>>[number];
const refOf = (slug: string, title: string) => `${slug}|${title}`;

/** Itens padrão de uma tarefa gerada pela jornada (usa o journeyKey da tarefa). */
export async function assetsForJourneyKey(actor: Actor, journeyKey: string | null): Promise<Asset[]> {
  if (!journeyKey) return [];
  const [base] = journeyKey.split(LEAD_SEP);
  const [slug, si, ti] = base.split(":");
  const esteiras = await listEsteirasFor(actor.organizationId);
  const task = esteiras.find((e) => e.slug === slug)?.stages[Number(si)]?.tasks[Number(ti)];
  if (!task) return [];
  const ref = refOf(slug, task.title);
  return (await listAssets(actor)).filter((a) => a.taskRefs.includes(ref));
}

// ---- Jornada no cliente e no lead -------------------------------------------

export interface JourneyTaskView {
  key: string;
  title: string;
  day: number;
  dueDate: string;
  minutes: number;
  items: number;
  checklist: string[];
  category: string;
  priority: string | null;
  description: string | null;
  assets: Asset[];
  generated: { id: string; status: string } | null;
}
export interface JourneyStageView {
  slug: string;
  stageIdx: number;
  name: string;
  tasks: JourneyTaskView[];
  generatedCount: number;
}
export interface JourneyView {
  stage: JourneyStage;
  esteira: { slug: string; name: string; summary: string; icon: Esteira["icon"]; tone: Esteira["tone"] };
  stages: JourneyStageView[];
}

async function build(actor: Actor, only: JourneyStage[] | null, where: { clientId?: string; leadId?: string }, startDate: string): Promise<JourneyView[]> {
  const [esteiras, assets] = await Promise.all([listEsteirasFor(actor.organizationId), listAssets(actor)]);
  const suffix = where.leadId ? `${LEAD_SEP}${where.leadId}` : "";
  const existing = await prisma.task.findMany({
    where: where.clientId
      ? { organizationId: actor.organizationId, clientId: where.clientId, journeyKey: { not: null }, archivedAt: null }
      : { organizationId: actor.organizationId, journeyKey: { endsWith: suffix }, archivedAt: null },
    select: { id: true, status: true, journeyKey: true },
  });
  const by = new Map(existing.map((t) => [t.journeyKey!, t]));
  return JOURNEY_STAGES.filter((s) => !only || only.includes(s)).flatMap((stage) =>
    esteiras.filter((e) => e.stage === stage).map((e) => ({
      stage,
      esteira: { slug: e.slug, name: e.name, summary: e.summary, icon: e.icon, tone: e.tone },
      stages: e.stages.map((s, si) => {
        const tasks = s.tasks.map((t, ti) => {
          const key = taskKey(e.slug, si, ti);
          const g = by.get(key + suffix);
          return {
            key, title: t.title, day: t.day, dueDate: businessDay(addDays(startDate, t.day)), minutes: t.minutes, items: t.items.length, checklist: t.items, category: t.category as string, priority: (t.priority ?? null) as string | null, description: t.description ?? null,
            assets: assets.filter((a) => a.taskRefs.includes(refOf(e.slug, t.title))),
            generated: g ? { id: g.id, status: g.status } : null,
          };
        });
        return { slug: e.slug, stageIdx: si, name: s.name, tasks, generatedCount: tasks.filter((t) => t.generated).length };
      }),
    })),
  );
}

export async function journeyForClient(actor: Actor, clientId: string, startDate: string) {
  await assertClientAccess(actor, clientId);
  return build(actor, null, { clientId }, startDate);
}

export async function journeyForLead(actor: Actor, leadId: string, startDate: string) {
  assertCan(actor, "crm.manage");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: actor.organizationId }, select: { id: true } });
  if (!lead) throw new NotFoundError("Lead não encontrado.");
  return build(actor, ["COMERCIAL"], { leadId }, startDate);
}

/** Gera as tarefas de uma etapa da esteira, com prazo = data de início + dia de cada tarefa (em dia útil). */
export async function applyJourneyStage(actor: Actor, input: { slug: string; stageIdx: number; startDate: string; ownerId?: string; clientId?: string; leadId?: string }) {
  const esteira = (await listEsteirasFor(actor.organizationId)).find((e) => e.slug === input.slug);
  const stage = esteira?.stages[input.stageIdx];
  if (!esteira || !stage) throw new NotFoundError("Etapa não encontrada.");
  const keys = stage.tasks.map((_, ti) => `${input.stageIdx}.${ti}`);
  if (input.clientId) {
    return applyEsteira(actor, { slug: input.slug, clientId: input.clientId, startDate: input.startDate, ownerId: input.ownerId || undefined, keys });
  }
  assertCan(actor, "crm.manage");
  const lead = await prisma.lead.findFirst({ where: { id: input.leadId ?? "", organizationId: actor.organizationId } });
  if (!lead) throw new NotFoundError("Lead não encontrado.");
  if (input.ownerId) {
    const m = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: input.ownerId, organizationId: actor.organizationId } } });
    if (!m || !m.active) throw new ValidationError("O responsável não pertence à empresa.");
  }
  const suffix = `${LEAD_SEP}${lead.id}`;
  const have = new Set((await prisma.task.findMany({ where: { organizationId: actor.organizationId, journeyKey: { endsWith: suffix }, archivedAt: null }, select: { journeyKey: true } })).map((t) => t.journeyKey));
  let created = 0;
  for (const [ti, t] of stage.tasks.entries()) {
    const key = taskKey(input.slug, input.stageIdx, ti) + suffix;
    if (have.has(key)) continue;
    await prisma.task.create({
      data: {
        organizationId: actor.organizationId, clientId: null, journeyKey: key,
        title: `${t.title} — ${lead.companyName}`,
        description: [stage.name, `Lead: ${lead.companyName}`].join(" — "),
        category: t.category, priority: t.priority ?? "NORMAL", estimatedMinutes: t.minutes,
        dueAt: localDateTimeToInstant(businessDay(addDays(input.startDate, t.day)), "18:00", APP_TIMEZONE),
        assigneeId: input.ownerId || null, createdById: actor.userId, origin: "MANUAL",
        checklistItems: { create: t.items.map((label, position) => ({ label, position })) },
      },
    });
    created++;
  }
  if (!created) throw new ValidationError("As tarefas desta etapa já foram geradas para este lead.");
  return { created, skipped: stage.tasks.length - created, projectId: null };
}
