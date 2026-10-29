import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Datas "de calendário" (sem horário) são representadas como strings
 * AAAA-MM-DD. Toda a aritmética é feita em UTC para não sofrer influência do
 * fuso do servidor. A conversão para instantes reais acontece apenas em
 * `localDateTimeToInstant`, usando o fuso configurado (padrão America/Sao_Paulo).
 */
export type LocalDate = string;

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value: LocalDate): { y: number; m: number; d: number } {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`Data inválida: ${value}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function isValidLocalDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const { y, m, d } = parseLocalDate(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function makeLocalDate(y: number, m: number, d: number): LocalDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toUtcDate(value: LocalDate): Date {
  const { y, m, d } = parseLocalDate(value);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(date: Date): LocalDate {
  return makeLocalDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** 0 = domingo ... 6 = sábado */
export function weekday(value: LocalDate): number {
  return toUtcDate(value).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function diffInDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

export function maxLocalDate(...values: LocalDate[]): LocalDate {
  return values.reduce((a, b) => (a > b ? a : b));
}

export function minLocalDate(...values: LocalDate[]): LocalDate {
  return values.reduce((a, b) => (a < b ? a : b));
}

/** Converte data local + horário (HH:mm) no fuso informado para um instante UTC. */
export function localDateTimeToInstant(date: LocalDate, time: string, timezone = DEFAULT_TIMEZONE): Date {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error(`Horário inválido: ${time}`);
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

/** Data de calendário de um instante no fuso informado. */
export function instantToLocalDate(instant: Date, timezone = DEFAULT_TIMEZONE): LocalDate {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

export function instantToLocalTime(instant: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(instant, timezone, "HH:mm");
}

/**
 * Colunas Postgres do tipo DATE chegam do Prisma como Date à meia-noite UTC.
 * Estas funções convertem entre esse formato e LocalDate sem deslocamento de fuso.
 */
export function dbDateToLocalDate(value: Date): LocalDate {
  return fromUtcDate(value);
}

export function localDateToDbDate(value: LocalDate): Date {
  return toUtcDate(value);
}

/** Início e fim (exclusivo) de um dia local, como instantes UTC. */
export function localDayRange(date: LocalDate, timezone = DEFAULT_TIMEZONE): { start: Date; end: Date } {
  return {
    start: localDateTimeToInstant(date, "00:00", timezone),
    end: localDateTimeToInstant(addDays(date, 1), "00:00", timezone),
  };
}

export function competenceOf(date: LocalDate, rule: "NONE" | "CURRENT_MONTH" | "PREVIOUS_MONTH"): string | null {
  if (rule === "NONE") return null;
  const { y, m } = parseLocalDate(date);
  const target = rule === "PREVIOUS_MONTH" ? addMonths(y, m, -1) : { y, m };
  return `${target.y}-${String(target.m).padStart(2, "0")}`;
}
