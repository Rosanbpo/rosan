import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { DEFAULT_TIMEZONE, type LocalDate } from "@/domain/dates";

const TZ = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;

export function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), TZ, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), TZ, "dd/MM/yyyy", { locale: ptBR });
}

/** Datas de calendário (colunas DATE / AAAA-MM-DD), sem conversão de fuso. */
export function fmtLocalDate(value: LocalDate | Date | null | undefined): string {
  if (!value) return "—";
  const iso = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtWeekdayDate(value: Date): string {
  return formatInTimeZone(value, TZ, "EEE, dd/MM", { locale: ptBR });
}

export function fmtCompetence(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m] = value.split("-");
  return `${m}/${y}`;
}

export function fmtMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
}

export function fmtPercent(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** "há 3 dias", "em 2 dias", "hoje" — granularidade de dias. */
export function relativeDays(target: Date, now = new Date()): string {
  const days = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) {
    const hours = Math.round((target.getTime() - now.getTime()) / 3_600_000);
    if (hours === 0) return "agora";
    return hours > 0 ? `em ${hours}h` : `há ${-hours}h`;
  }
  return days > 0 ? `em ${days} dia${days > 1 ? "s" : ""}` : `há ${-days} dia${days < -1 ? "s" : ""}`;
}

export function waitingTime(since: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  if (days < 1) return "menos de 1 dia";
  return `${days} dia${days > 1 ? "s" : ""}`;
}

export function fmtCnpj(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
