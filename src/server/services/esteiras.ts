import { addDays, localDateTimeToInstant, localDateToDbDate, weekday } from "@/domain/dates";
import { ESTEIRAS, getEsteira as getDefaultEsteira, taskKey, textToStages, type Esteira, type EsteiraStage } from "@/domain/esteiras";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { esteiraApplySchema, parseInput } from "../validation";
import { assertClientAccess, clientScope } from "./access";
import { recordAudit } from "./audit";

const businessDay = (date: string) => {
  const w = weekday(date);
  return w === 6 ? addDays(date, 2) : w === 0 ? addDays(date, 1) : date;
};

/**
 * Aplica tarefas de uma esteira a um cliente. Cada tarefa nasce com seu checklist e prazo
 * em dia útil. Tarefas já aplicadas ao mesmo cliente são ignoradas (não duplica).
 */
export async function applyEsteira(actor: Actor, raw: unknown) {
  assertCan(actor, "projects.manage");
  const input = parseInput(esteiraApplySchema, raw);
  const esteira = await getEsteiraFor(actor.organizationId, input.slug);
  if (!esteira) throw new NotFoundError("Esteira não encontrada.");
  await assertClientAccess(actor, input.clientId);
  if (input.ownerId) {
    const m = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: input.ownerId, organizationId: actor.organizationId } },
    });
    if (!m || !m.active) throw new ValidationError("O responsável não pertence à empresa.", { ownerId: "Selecione um responsável." });
  }

  // Resolve as chaves marcadas ("etapa.tarefa") em tarefas do catálogo.
  const selected: Array<{ key: string; stageName: string; task: (typeof esteira.stages)[number]["tasks"][number] }> = [];
  esteira.stages.forEach((stage, si) =>
    stage.tasks.forEach((task, ti) => {
      if (input.keys.includes(`${si}.${ti}`)) selected.push({ key: taskKey(esteira.slug, si, ti), stageName: stage.name, task });
    }),
  );
  if (!selected.length) throw new ValidationError("Selecione ao menos uma tarefa.", { keys: "Selecione ao menos uma tarefa." });

  const client = await prisma.client.findUniqueOrThrow({ where: { id: input.clientId }, select: { tradeName: true } });
  const already = await prisma.task.findMany({
    where: { organizationId: actor.organizationId, clientId: input.clientId, journeyKey: { in: selected.map((s) => s.key) }, archivedAt: null },
    select: { journeyKey: true },
  });
  const doneKeys = new Set(already.map((a) => a.journeyKey));
  const toCreate = selected.filter((s) => !doneKeys.has(s.key));
  if (!toCreate.length) {
    throw new ValidationError("Essas tarefas já foram aplicadas a este cliente.", { keys: "Todas as tarefas marcadas já existem para este cliente." });
  }

  return prisma.$transaction(async (tx) => {
    let projectId: string | null = null;
    if (input.createProject) {
      const lastDay = Math.max(...toCreate.map((s) => s.task.day));
      const project = await tx.project.create({
        data: {
          organizationId: actor.organizationId,
          clientId: input.clientId,
          name: `${esteira.name} — ${client.tradeName}`,
          description: esteira.summary,
          status: "EM_ANDAMENTO",
          startDate: localDateToDbDate(input.startDate),
          dueDate: localDateToDbDate(businessDay(addDays(input.startDate, lastDay))),
          ownerId: input.ownerId ?? null,
        },
      });
      projectId = project.id;
    }
    for (const { key, stageName, task } of toCreate) {
      await tx.task.create({
        data: {
          organizationId: actor.organizationId,
          clientId: input.clientId,
          projectId,
          journeyKey: key,
          title: task.title,
          description: [stageName, task.description].filter(Boolean).join(" — "),
          category: task.category,
          priority: task.priority ?? "NORMAL",
          estimatedMinutes: task.minutes,
          dueAt: localDateTimeToInstant(businessDay(addDays(input.startDate, task.day)), "18:00", APP_TIMEZONE),
          assigneeId: input.ownerId ?? null,
          createdById: actor.userId,
          origin: "MANUAL",
          checklistItems: { create: task.items.map((label, position) => ({ label, position })) },
        },
      });
    }
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: input.clientId,
      clientId: input.clientId,
      action: "esteira.applied",
      summary: `Esteira "${esteira.name}" aplicada: ${toCreate.length} tarefa(s)`,
    });
    return { created: toCreate.length, skipped: selected.length - toCreate.length, projectId };
  });
}

export interface EsteiraProgress {
  /** Clientes que têm ao menos uma tarefa desta esteira. */
  clients: Array<{ id: string; name: string; total: number; done: number }>;
}

/** Andamento de cada esteira nos clientes que o usuário enxerga. */
export async function esteiraProgress(actor: Actor, opts: { clientId?: string } = {}): Promise<Record<string, EsteiraProgress>> {
  const rows = await prisma.task.findMany({
    where: {
      organizationId: actor.organizationId,
      archivedAt: null,
      journeyKey: { not: null },
      client: clientScope(actor),
      ...(opts.clientId ? { clientId: opts.clientId } : {}),
    },
    select: { journeyKey: true, status: true, client: { select: { id: true, tradeName: true } } },
  });
  const out: Record<string, EsteiraProgress> = {};
  for (const r of rows) {
    const cl = r.client;
    if (!cl) continue;
    const slug = r.journeyKey!.split(":")[0]!;
    const entry = (out[slug] ??= { clients: [] });
    let c = entry.clients.find((x) => x.id === cl.id);
    if (!c) entry.clients.push((c = { id: cl.id, name: cl.tradeName, total: 0, done: 0 }));
    if (r.status === "CANCELADA") continue;
    c.total++;
    if (r.status === "CONCLUIDA") c.done++;
  }
  for (const e of Object.values(out)) e.clients.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return out;
}

/** Esteiras da empresa: o catálogo padrão com as personalizações salvas por cima. */
export async function listEsteirasFor(organizationId: string): Promise<Array<Esteira & { custom: boolean }>> {
  const rows = await prisma.esteiraCustom.findMany({ where: { organizationId } });
  const by = new Map(rows.map((r) => [r.slug, r.stages as unknown as EsteiraStage[]]));
  return ESTEIRAS.map((e) => ({ ...e, stages: by.get(e.slug) ?? e.stages, custom: by.has(e.slug) }));
}

export async function getEsteiraFor(organizationId: string, slug: string) {
  return (await listEsteirasFor(organizationId)).find((e) => e.slug === slug);
}

export async function saveEsteiraText(actor: Actor, slug: string, text: string) {
  assertCan(actor, "templates.manage");
  if (!getDefaultEsteira(slug)) throw new NotFoundError("Esteira não encontrada.");
  let stages: EsteiraStage[];
  try {
    stages = textToStages(text);
  } catch (e) {
    throw new ValidationError((e as Error).message, { text: (e as Error).message });
  }
  const before = (await getEsteiraFor(actor.organizationId, slug))!.stages;
  await prisma.$transaction(async (tx) => {
    await tx.esteiraCustom.upsert({
      where: { organizationId_slug: { organizationId: actor.organizationId, slug } },
      create: { organizationId: actor.organizationId, slug, stages: stages as unknown as object },
      update: { stages: stages as unknown as object },
    });
    await carryLinks(tx, actor.organizationId, slug, before, stages);
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Depois de editar uma esteira, mantém ligado o que dependia da posição ou do título das tarefas:
 * os textos padrão (mensagem, e-mail, documento) e as tarefas já geradas para clientes e leads.
 * Tarefa renomeada na mesma posição segue ligada; tarefa que sumiu perde o vínculo (a tarefa gerada continua existindo).
 */
export async function carryLinks(tx: Tx, organizationId: string, slug: string, before: EsteiraStage[], after: EsteiraStage[]) {
  const flat = (st: EsteiraStage[]) => st.flatMap((s, si) => s.tasks.map((t, ti) => ({ si, ti, title: t.title })));
  const oldT = flat(before);
  const newT = flat(after);
  const oldTitles = new Set(oldT.map((t) => t.title));
  const map = new Map<string, { key: string; title: string } | null>(); // chave antiga -> nova
  oldT.forEach((o, i) => {
    const sameTitle = newT.find((n) => n.title === o.title);
    const renamed = newT[i] && !oldTitles.has(newT[i].title) ? newT[i] : undefined;
    const to = sameTitle ?? renamed;
    map.set(taskKey(slug, o.si, o.ti), to ? { key: taskKey(slug, to.si, to.ti), title: to.title } : null);
  });

  // textos padrão: "slug|título"
  const assets = await tx.journeyAsset.findMany({ where: { organizationId, taskRefs: { hasSome: oldT.map((o) => `${slug}|${o.title}`) } } });
  for (const a of assets) {
    const refs = a.taskRefs.flatMap((r) => {
      if (!r.startsWith(`${slug}|`)) return [r];
      const old = oldT.find((o) => `${slug}|${o.title}` === r);
      const to = old ? map.get(taskKey(slug, old.si, old.ti)) : undefined;
      return to ? [`${slug}|${to.title}`] : old ? [] : [r];
    });
    if (refs.join("\n") !== a.taskRefs.join("\n")) await tx.journeyAsset.update({ where: { id: a.id }, data: { taskRefs: [...new Set(refs)] } });
  }

  // tarefas já geradas: journeyKey "slug:etapa:tarefa" (com "@leadId" nos leads). Duas fases para não colidir.
  const tasks = await tx.task.findMany({ where: { organizationId, journeyKey: { startsWith: `${slug}:` } }, select: { id: true, journeyKey: true } });
  const moves = tasks.flatMap((t) => {
    const [base, ...suffix] = t.journeyKey!.split("@");
    if (!map.has(base)) return [];
    const to = map.get(base);
    return [{ id: t.id, next: to ? [to.key, ...suffix].join("@") : null, tmp: `tmp:${t.id}` }];
  });
  const changed = moves.filter((m) => m.next !== tasks.find((t) => t.id === m.id)!.journeyKey);
  for (const m of changed) await tx.task.update({ where: { id: m.id }, data: { journeyKey: m.tmp } });
  for (const m of changed) await tx.task.update({ where: { id: m.id }, data: { journeyKey: m.next } });
}

export async function resetEsteira(actor: Actor, slug: string) {
  assertCan(actor, "templates.manage");
  const before = (await getEsteiraFor(actor.organizationId, slug))?.stages ?? [];
  const def = getDefaultEsteira(slug);
  await prisma.$transaction(async (tx) => {
    await tx.esteiraCustom.deleteMany({ where: { organizationId: actor.organizationId, slug } });
    if (def) await carryLinks(tx, actor.organizationId, slug, before, def.stages);
  });
}
