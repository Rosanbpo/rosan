import { addDays, localDateTimeToInstant, localDateToDbDate, weekday } from "@/domain/dates";
import { getEsteira, taskKey } from "@/domain/esteiras";
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
  const esteira = getEsteira(input.slug);
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
    const slug = r.journeyKey!.split(":")[0]!;
    const entry = (out[slug] ??= { clients: [] });
    let c = entry.clients.find((x) => x.id === r.client.id);
    if (!c) entry.clients.push((c = { id: r.client.id, name: r.client.tradeName, total: 0, done: 0 }));
    if (r.status === "CANCELADA") continue;
    c.total++;
    if (r.status === "CONCLUIDA") c.done++;
  }
  for (const e of Object.values(out)) e.clients.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return out;
}
