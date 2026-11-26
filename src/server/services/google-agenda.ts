import ical, { type VEvent } from "node-ical";
import { assertCan, type Actor } from "@/domain/permissions";
import { instantToLocalDate, localDateTimeToInstant, type LocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import type { AgendaEvent } from "./agenda";

const CACHE = new Map<string, { at: number; body: string }>();
const TTL = 5 * 60 * 1000;

export function validGoogleIcsUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.hostname !== "calendar.google.com" || !u.pathname.endsWith(".ics")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function getImport(actor: Actor) {
  return prisma.agendaImport.findUnique({ where: { userId: actor.userId } });
}

export async function saveImport(actor: Actor, raw: string) {
  assertCan(actor, "dashboard.view");
  const url = validGoogleIcsUrl(raw);
  if (!url) throw new Error("Cole o “Endereço secreto no formato iCal” do Google Agenda (começa com https://calendar.google.com/ e termina em .ics).");
  await prisma.agendaImport.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, organizationId: actor.organizationId, url },
    update: { url },
  });
  CACHE.delete(url);
}

export async function removeImport(actor: Actor) {
  await prisma.agendaImport.deleteMany({ where: { userId: actor.userId } });
}

const hhmm = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** Compromissos do Google Agenda entre duas datas (início inclusive, fim exclusivo). Falha em silêncio: devolve erro para a tela avisar. */
export async function googleEvents(actor: Actor, first: LocalDate, after: LocalDate): Promise<{ events: AgendaEvent[]; error?: string }> {
  const imp = await getImport(actor);
  if (!imp) return { events: [] };
  try {
    let hit = CACHE.get(imp.url);
    if (!hit || Date.now() - hit.at > TTL) {
      const res = await fetch(imp.url, { signal: AbortSignal.timeout(8000), redirect: "error" });
      if (!res.ok) throw new Error(`Google respondeu ${res.status}`);
      hit = { at: Date.now(), body: await res.text() };
      CACHE.set(imp.url, hit);
    }
    const from = localDateTimeToInstant(first, "00:00", APP_TIMEZONE);
    const to = localDateTimeToInstant(after, "00:00", APP_TIMEZONE);
    const parsed = ical.sync.parseICS(hit.body);
    const out: AgendaEvent[] = [];
    for (const item of Object.values(parsed)) {
      if (!item || item.type !== "VEVENT") continue;
      const ev = item as VEvent;
      if (ev.status === "CANCELLED") continue;
      const label = String(typeof ev.summary === "object" && ev.summary ? (ev.summary as { val: string }).val : ev.summary ?? "(sem título)");
      const insts = ev.rrule ? ical.expandRecurringEvent(ev, { from, to }) : [{ start: ev.start, end: ev.end, isFullDay: ev.datetype === "date" }];
      for (const i of insts) {
        if (!i.start) continue;
        const full = !!i.isFullDay;
        const date = full ? (i.start as Date).toISOString().slice(0, 10) : instantToLocalDate(i.start as Date, APP_TIMEZONE);
        if (date < first || date >= after) continue;
        out.push({ date, kind: "GOOGLE", label, href: typeof ev.url === "string" && ev.url ? ev.url : "https://calendar.google.com/calendar", time: full ? undefined : hhmm(i.start as Date), endTime: full || !i.end ? undefined : hhmm(i.end as Date), external: true });
      }
    }
    return { events: out };
  } catch (e) {
    return { events: [], error: e instanceof Error ? e.message : "Não consegui ler o Google Agenda." };
  }
}
