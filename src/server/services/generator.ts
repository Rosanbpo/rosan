import { Prisma, type PrismaClient } from "@prisma/client";
import { dbDateToLocalDate, instantToLocalDate, type LocalDate } from "@/domain/dates";
import type { CompetenceRule, Frequency, NonBusinessDayRule } from "@/domain/enums";
import {
  nextOccurrence,
  occurrencesDue,
  taskTimingFor,
  type HolidaySet,
  type RecurrenceRule,
} from "@/domain/recurrence";
import { prisma as defaultPrisma } from "../db";

/**
 * Geração de tarefas a partir de recorrências.
 *
 * Idempotência: cada ocorrência tem uma chave (data nominal da regra) e a
 * tabela de tarefas possui restrição única (recurrenceId, occurrenceKey).
 * Rodar o processo várias vezes, ou em paralelo, nunca duplica tarefas.
 */

const recurrenceInclude = {
  template: { include: { checklistItems: { orderBy: { position: "asc" } } } },
  client: { select: { id: true, tradeName: true, status: true, archivedAt: true, responsibleOperatorId: true } },
} satisfies Prisma.RecurrenceInclude;

export type RecurrenceWithTemplate = Prisma.RecurrenceGetPayload<{ include: typeof recurrenceInclude }>;

export function ruleOf(r: {
  frequency: Frequency;
  weekdays: number[];
  monthDays: number[];
  nthBusinessDay: number | null;
  nonBusinessDayRule: NonBusinessDayRule;
  startDate: Date;
  endDate: Date | null;
}): RecurrenceRule {
  return {
    frequency: r.frequency,
    weekdays: r.weekdays,
    monthDays: r.monthDays,
    nthBusinessDay: r.nthBusinessDay,
    nonBusinessDayRule: r.nonBusinessDayRule,
    startDate: dbDateToLocalDate(r.startDate),
    endDate: r.endDate ? dbDateToLocalDate(r.endDate) : null,
  };
}

export async function loadHolidaySet(db: PrismaClient, organizationId: string): Promise<HolidaySet> {
  const rows = await db.holiday.findMany({ where: { organizationId }, select: { date: true } });
  return new Set(rows.map((h) => dbDateToLocalDate(h.date)));
}

/** Motivo pelo qual a recorrência não gera tarefas agora (ou null se gera). */
export function generationBlocker(r: RecurrenceWithTemplate): string | null {
  if (r.status !== "ACTIVE") return "Recorrência pausada";
  if (r.template.archivedAt) return "Modelo arquivado";
  if (r.client.archivedAt) return "Cliente arquivado";
  if (r.client.status === "PAUSADO" || r.client.status === "ENCERRADO") return "Cliente pausado ou encerrado";
  return null;
}

export interface GenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function generateForRecurrence(
  r: RecurrenceWithTemplate,
  holidays: HolidaySet,
  now: Date,
  db: PrismaClient = defaultPrisma,
): Promise<GenerationResult> {
  const result: GenerationResult = { created: 0, skipped: 0, errors: [] };
  if (generationBlocker(r)) return result;

  const today = instantToLocalDate(now, r.timezone);
  const occurrences = occurrencesDue(
    { rule: ruleOf(r), leadDays: r.leadDays, generationFloor: dbDateToLocalDate(r.generationFloor), today },
    holidays,
  );
  if (occurrences.length === 0) return result;

  const existing = await db.task.findMany({
    where: { recurrenceId: r.id },
    select: { occurrenceKey: true, dueAt: true },
  });
  const existingKeys = new Set(existing.map((t) => t.occurrenceKey));
  const existingDueDates = new Set(existing.map((t) => instantToLocalDate(t.dueAt, r.timezone)));

  const t = r.template;
  for (const occurrence of occurrences) {
    if (existingKeys.has(occurrence.key) || existingDueDates.has(occurrence.dueDate)) {
      result.skipped++;
      continue;
    }
    const timing = taskTimingFor(occurrence, {
      dueTime: r.dueTime,
      startOffsetDays: r.startOffsetDays,
      competenceRule: t.competenceRule as CompetenceRule,
      timezone: r.timezone,
    });
    const assigneeId = r.assigneeId ?? r.client.responsibleOperatorId ?? null;
    try {
      await db.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            organizationId: r.organizationId,
            clientId: r.clientId,
            title: timing.competence ? `${t.title} — ${timing.competence.split("-").reverse().join("/")}` : t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            competence: timing.competence,
            dueAt: timing.dueAt,
            startAt: timing.startAt,
            estimatedMinutes: t.estimatedMinutes,
            requiresEvidence: t.requiresEvidence,
            origin: "RECORRENTE",
            recurrenceId: r.id,
            occurrenceKey: occurrence.key,
            assigneeId,
            reviewerId: r.reviewerId && r.reviewerId !== assigneeId ? r.reviewerId : null,
            checklistItems: {
              create: t.checklistItems.map((c) => ({ label: c.label, required: c.required, position: c.position })),
            },
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: r.organizationId,
            actorId: null,
            entityType: "Task",
            entityId: task.id,
            taskId: task.id,
            clientId: r.clientId,
            action: "task.generated",
            summary: `Tarefa gerada pela rotina "${t.name}" (ocorrência ${occurrence.key.split("-").reverse().join("/")})`,
          },
        });
      });
      existingKeys.add(occurrence.key);
      existingDueDates.add(occurrence.dueDate);
      result.created++;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Outra execução concorrente criou a mesma ocorrência: comportamento esperado.
        result.skipped++;
      } else {
        result.errors.push(`${r.id}/${occurrence.key}: ${(error as Error).message}`);
      }
    }
  }
  if (result.created > 0) {
    await db.recurrence.update({ where: { id: r.id }, data: { lastGeneratedAt: now } });
  }
  return result;
}

const LOCK_ID = "recurrence-generator";
const LOCK_TTL_MS = 10 * 60 * 1000;

async function acquireLock(db: PrismaClient, holder: string): Promise<boolean> {
  await db.schedulerLock.upsert({ where: { id: LOCK_ID }, create: { id: LOCK_ID }, update: {} });
  const now = new Date();
  // Atualização condicional atômica: só um processo consegue a trava por vez.
  const res = await db.schedulerLock.updateMany({
    where: { id: LOCK_ID, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + LOCK_TTL_MS), holder },
  });
  return res.count === 1;
}

async function releaseLock(db: PrismaClient, holder: string) {
  await db.schedulerLock.updateMany({ where: { id: LOCK_ID, holder }, data: { lockedUntil: null, holder: null } });
}

export interface SchedulerOptions {
  now?: Date;
  organizationId?: string;
  recurrenceId?: string;
  trigger: string;
  db?: PrismaClient;
}

export interface SchedulerSummary extends GenerationResult {
  recurrences: number;
  locked: boolean;
}

/**
 * Executa a geração para todas as recorrências ativas (ou um subconjunto).
 * Uma trava com expiração evita execuções simultâneas; mesmo sem ela, a
 * restrição única do banco impede duplicação de tarefas.
 */
export async function runScheduler(options: SchedulerOptions): Promise<SchedulerSummary> {
  const db = options.db ?? defaultPrisma;
  const now = options.now ?? new Date();
  const summary: SchedulerSummary = { created: 0, skipped: 0, errors: [], recurrences: 0, locked: false };

  const holder = `${options.trigger}:${process.pid}:${now.getTime()}:${Math.random().toString(36).slice(2)}`;
  if (!(await acquireLock(db, holder))) {
    summary.locked = true;
    return summary;
  }
  const run = await db.schedulerRun.create({
    data: { trigger: options.trigger, organizationId: options.organizationId ?? null },
  });
  try {
    const recurrences = await db.recurrence.findMany({
      where: {
        status: "ACTIVE",
        ...(options.organizationId ? { organizationId: options.organizationId } : {}),
        ...(options.recurrenceId ? { id: options.recurrenceId } : {}),
      },
      include: recurrenceInclude,
    });
    const holidayCache = new Map<string, HolidaySet>();
    for (const r of recurrences) {
      summary.recurrences++;
      if (!holidayCache.has(r.organizationId)) holidayCache.set(r.organizationId, await loadHolidaySet(db, r.organizationId));
      const res = await generateForRecurrence(r, holidayCache.get(r.organizationId)!, now, db);
      summary.created += res.created;
      summary.skipped += res.skipped;
      summary.errors.push(...res.errors);
    }
  } catch (error) {
    summary.errors.push((error as Error).message);
  } finally {
    await db.schedulerRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        created: summary.created,
        skipped: summary.skipped,
        errors: summary.errors.length,
        details: { recurrences: summary.recurrences, errors: summary.errors.slice(0, 20) },
      },
    });
    await releaseLock(db, holder);
  }
  return summary;
}

/** Próxima ocorrência ainda não gerada e a data em que será gerada. */
export async function previewNext(
  r: RecurrenceWithTemplate,
  holidays: HolidaySet,
  now: Date,
  db: PrismaClient = defaultPrisma,
): Promise<{ dueDate: LocalDate; generateOn: LocalDate } | null> {
  if (generationBlocker(r)) return null;
  const keys = await db.task.findMany({ where: { recurrenceId: r.id }, select: { occurrenceKey: true } });
  const today = instantToLocalDate(now, r.timezone);
  const next = nextOccurrence(
    { rule: ruleOf(r), leadDays: r.leadDays, generationFloor: dbDateToLocalDate(r.generationFloor), today },
    new Set(keys.map((k) => k.occurrenceKey ?? "")),
    holidays,
  );
  return next ? { dueDate: next.dueDate, generateOn: next.generateOn } : null;
}

export { recurrenceInclude };
