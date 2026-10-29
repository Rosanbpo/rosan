import {
  addDays,
  addMonths,
  competenceOf,
  daysInMonth,
  localDateTimeToInstant,
  makeLocalDate,
  maxLocalDate,
  minLocalDate,
  parseLocalDate,
  weekday,
  type LocalDate,
} from "./dates";
import type { CompetenceRule, Frequency, NonBusinessDayRule } from "./enums";

export interface RecurrenceRule {
  frequency: Frequency;
  /** 0 = domingo ... 6 = sábado (WEEKLY) */
  weekdays: number[];
  /** Dia(s) do mês: 1 dia (MONTHLY_DAY) ou 2 dias (BIWEEKLY) */
  monthDays: number[];
  /** n-ésimo dia útil (MONTHLY_NTH_BUSINESS_DAY) */
  nthBusinessDay: number | null;
  nonBusinessDayRule: NonBusinessDayRule;
  startDate: LocalDate;
  endDate: LocalDate | null;
}

export interface Occurrence {
  /** Data nominal da regra (antes do ajuste). Usada como chave de idempotência. */
  key: LocalDate;
  /** Data de vencimento após o ajuste de dias não úteis. */
  dueDate: LocalDate;
}

export type HolidaySet = ReadonlySet<LocalDate>;

export function isBusinessDay(date: LocalDate, holidays: HolidaySet): boolean {
  const wd = weekday(date);
  return wd !== 0 && wd !== 6 && !holidays.has(date);
}

/** Ajusta uma data não útil conforme a regra (antecipar ou postergar). */
export function adjustToBusinessDay(date: LocalDate, rule: NonBusinessDayRule, holidays: HolidaySet): LocalDate {
  let current = date;
  const step = rule === "ANTICIPATE" ? -1 : 1;
  // Limite de segurança: nenhum calendário real tem 60 dias seguidos não úteis.
  for (let i = 0; i < 60 && !isBusinessDay(current, holidays); i++) current = addDays(current, step);
  return current;
}

/** Dia do mês limitado ao último dia (ex.: 31 em fevereiro → 28/29). */
export function clampDayOfMonth(y: number, m: number, day: number): LocalDate {
  return makeLocalDate(y, m, Math.min(Math.max(day, 1), daysInMonth(y, m)));
}

/** n-ésimo dia útil do mês. Se o mês tiver menos dias úteis, retorna o último dia útil. */
export function nthBusinessDayOfMonth(y: number, m: number, n: number, holidays: HolidaySet): LocalDate {
  let count = 0;
  let last: LocalDate | null = null;
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = makeLocalDate(y, m, d);
    if (isBusinessDay(date, holidays)) {
      count++;
      last = date;
      if (count === n) return date;
    }
  }
  // Mês sem dia útil é impossível na prática; cai para o último dia do mês.
  return last ?? makeLocalDate(y, m, daysInMonth(y, m));
}

export function validateRule(rule: RecurrenceRule): string | null {
  switch (rule.frequency) {
    case "WEEKLY":
      if (rule.weekdays.length === 0) return "Selecione ao menos um dia da semana.";
      if (rule.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "Dia da semana inválido.";
      break;
    case "BIWEEKLY":
      if (rule.monthDays.length !== 2) return "Informe duas datas do mês para a recorrência quinzenal.";
      if (rule.monthDays[0] === rule.monthDays[1]) return "As duas datas quinzenais devem ser diferentes.";
      if (rule.monthDays.some((d) => !Number.isInteger(d) || d < 1 || d > 31)) return "Dia do mês inválido.";
      break;
    case "MONTHLY_DAY":
      if (rule.monthDays.length !== 1) return "Informe o dia do mês.";
      if (rule.monthDays.some((d) => !Number.isInteger(d) || d < 1 || d > 31)) return "Dia do mês inválido.";
      break;
    case "MONTHLY_NTH_BUSINESS_DAY":
      if (!rule.nthBusinessDay || rule.nthBusinessDay < 1 || rule.nthBusinessDay > 23)
        return "Informe o dia útil (entre 1 e 23).";
      break;
    case "DAILY_BUSINESS":
      break;
  }
  if (rule.endDate && rule.endDate < rule.startDate) return "A data de término deve ser posterior ao início.";
  return null;
}

/**
 * Ocorrências cuja data NOMINAL está em [from, to]. A data de vencimento já
 * vem ajustada para dia útil. Ocorrências fora de [startDate, endDate] são
 * descartadas. Datas de vencimento repetidas (ex.: duas datas nominais que
 * caem no mesmo dia útil após o ajuste) são unificadas, mantendo a primeira.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: LocalDate,
  to: LocalDate,
  holidays: HolidaySet,
): Occurrence[] {
  const start = maxLocalDate(from, rule.startDate);
  const end = rule.endDate ? minLocalDate(to, rule.endDate) : to;
  if (start > end) return [];

  const nominal: Occurrence[] = [];
  const push = (key: LocalDate, dueDate: LocalDate) => {
    if (key >= start && key <= end) nominal.push({ key, dueDate });
  };

  if (rule.frequency === "DAILY_BUSINESS" || rule.frequency === "WEEKLY") {
    const weekdays = new Set(rule.weekdays);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (rule.frequency === "DAILY_BUSINESS") {
        // Dias não úteis simplesmente não têm ocorrência.
        if (isBusinessDay(d, holidays)) push(d, d);
      } else if (weekdays.has(weekday(d))) {
        push(d, adjustToBusinessDay(d, rule.nonBusinessDayRule, holidays));
      }
    }
  } else {
    const s = parseLocalDate(start);
    const e = parseLocalDate(end);
    for (let ym = { y: s.y, m: s.m }; ym.y * 12 + ym.m <= e.y * 12 + e.m; ym = addMonths(ym.y, ym.m, 1)) {
      if (rule.frequency === "MONTHLY_NTH_BUSINESS_DAY") {
        const date = nthBusinessDayOfMonth(ym.y, ym.m, rule.nthBusinessDay ?? 1, holidays);
        push(date, date);
      } else {
        const days = [...rule.monthDays].sort((a, b) => a - b);
        for (const day of days) {
          const date = clampDayOfMonth(ym.y, ym.m, day);
          push(date, adjustToBusinessDay(date, rule.nonBusinessDayRule, holidays));
        }
      }
    }
  }

  const seenDue = new Set<LocalDate>();
  const seenKey = new Set<LocalDate>();
  return nominal
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .filter((o) => {
      if (seenDue.has(o.dueDate) || seenKey.has(o.key)) return false;
      seenDue.add(o.dueDate);
      seenKey.add(o.key);
      return true;
    });
}

/** Máximo de dias que um ajuste pode deslocar a data (folga para a janela). */
const ADJUSTMENT_SLACK_DAYS = 15;
/** Quanto tempo para trás o gerador procura ocorrências não geradas. */
export const MAX_LOOKBACK_DAYS = 90;

export interface GenerationWindowInput {
  rule: RecurrenceRule;
  leadDays: number;
  generationFloor: LocalDate;
  today: LocalDate;
}

/**
 * Ocorrências que devem existir hoje: vencimento até `hoje + antecedência`,
 * data nominal não anterior ao piso de geração (criação/reativação) e no
 * máximo MAX_LOOKBACK_DAYS para trás (recupera execuções perdidas do agendador).
 */
export function occurrencesDue(input: GenerationWindowInput, holidays: HolidaySet): Occurrence[] {
  const { rule, leadDays, generationFloor, today } = input;
  const horizon = addDays(today, Math.max(0, leadDays));
  const from = maxLocalDate(generationFloor, addDays(today, -MAX_LOOKBACK_DAYS));
  return occurrencesBetween(rule, from, addDays(horizon, ADJUSTMENT_SLACK_DAYS), holidays).filter(
    (o) => o.dueDate <= horizon,
  );
}

/** Próxima ocorrência ainda não gerada (para exibição de "próxima geração"). */
export function nextOccurrence(
  input: GenerationWindowInput,
  existingKeys: ReadonlySet<string>,
  holidays: HolidaySet,
): (Occurrence & { generateOn: LocalDate }) | null {
  const from = maxLocalDate(input.generationFloor, addDays(input.today, -MAX_LOOKBACK_DAYS));
  // Procura até ~13 meses à frente para cobrir regras mensais.
  const occurrences = occurrencesBetween(input.rule, from, addDays(input.today, 400), holidays);
  const next = occurrences.find((o) => !existingKeys.has(o.key));
  if (!next) return null;
  const generateOn = maxLocalDate(addDays(next.dueDate, -Math.max(0, input.leadDays)), input.today);
  return { ...next, generateOn };
}

export interface TaskTiming {
  dueAt: Date;
  startAt: Date;
  competence: string | null;
}

export function taskTimingFor(
  occurrence: Occurrence,
  options: { dueTime: string; startOffsetDays: number; competenceRule: CompetenceRule; timezone: string },
): TaskTiming {
  const dueAt = localDateTimeToInstant(occurrence.dueDate, options.dueTime, options.timezone);
  const startDate = addDays(occurrence.dueDate, -Math.max(0, options.startOffsetDays));
  const startTime = options.startOffsetDays === 0 && options.dueTime < "08:00" ? "00:00" : "08:00";
  const startAt = localDateTimeToInstant(startDate, startTime, options.timezone);
  return { dueAt, startAt: startAt > dueAt ? dueAt : startAt, competence: competenceOf(occurrence.dueDate, options.competenceRule) };
}

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Descrição legível da regra, em português. */
export function describeRule(r: {
  frequency: Frequency;
  weekdays: number[];
  monthDays: number[];
  nthBusinessDay: number | null;
  nonBusinessDayRule: NonBusinessDayRule;
  dueTime: string;
}): string {
  const adjust = r.nonBusinessDayRule === "ANTICIPATE" ? "antecipa" : "posterga";
  let base: string;
  switch (r.frequency) {
    case "DAILY_BUSINESS":
      return `Todo dia útil, até ${r.dueTime}`;
    case "WEEKLY":
      base = `Toda semana (${[...r.weekdays].sort().map((d) => WEEKDAY_NAMES[d]).join(", ")})`;
      break;
    case "BIWEEKLY":
      base = `Dias ${[...r.monthDays].sort((a, b) => a - b).join(" e ")} de cada mês`;
      break;
    case "MONTHLY_DAY":
      base = `Todo dia ${r.monthDays[0]} do mês`;
      break;
    case "MONTHLY_NTH_BUSINESS_DAY":
      return `${r.nthBusinessDay}º dia útil do mês, até ${r.dueTime}`;
  }
  return `${base}, até ${r.dueTime} (${adjust} se não for dia útil)`;
}
