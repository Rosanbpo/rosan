import { randomBytes } from "node:crypto";
import type { IcsEvent } from "@/domain/ics";
import { addDays, dbDateToLocalDate, instantToLocalDate, localDateTimeToInstant, makeLocalDate, parseLocalDate, type LocalDate } from "@/domain/dates";
import { contractTimeline } from "@/domain/renewal";
import { assertCan, can, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { clientScope } from "./access";
import { buildTaskWhere } from "./tasks";

export type AgendaEvent = { date: LocalDate; kind: "REUNIAO" | "TAREFA" | "LEAD" | "CONTRATO" | "VENCIMENTO" | "GOOGLE"; label: string; href: string; time?: string; endTime?: string; external?: boolean };

const hhmmLocal = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

const next = (y: number, m: number) => (m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 });

/** Tudo que acontece no mês, num só calendário: reuniões, prazos, leads, contratos e vencimentos. */
export async function agendaMonth(actor: Actor, month: string) {
  assertCan(actor, "dashboard.view");
  const { y, m } = parseLocalDate(`${month}-01`);
  const n = next(y, m);
  const first = makeLocalDate(y, m, 1);
  const after = makeLocalDate(n.y, n.m, 1);
  const from = localDateTimeToInstant(first, "00:00", APP_TIMEZONE);
  const to = localDateTimeToInstant(after, "00:00", APP_TIMEZONE);
  const events: AgendaEvent[] = [];

  const tasks = await prisma.task.findMany({
    where: { AND: [buildTaskWhere(actor, {}), { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, dueAt: { gte: from, lt: to } }] },
    select: { id: true, title: true, category: true, dueAt: true, client: { select: { tradeName: true } } },
    orderBy: { dueAt: "asc" },
    take: 600,
  });
  for (const t of tasks) events.push({ date: instantToLocalDate(t.dueAt!, APP_TIMEZONE), kind: t.category === "REUNIAO_CLIENTE" ? "REUNIAO" : "TAREFA", label: `${t.title}${t.client ? ` · ${t.client.tradeName}` : ""}`, href: `/tarefas/${t.id}`, time: hhmmLocal(t.dueAt!) === "00:00" ? undefined : hhmmLocal(t.dueAt!) });

  if (can(actor, "crm.manage")) {
    const leads = await prisma.lead.findMany({ where: { organizationId: actor.organizationId, nextActionAt: { gte: new Date(`${first}T00:00:00Z`), lt: new Date(`${after}T00:00:00Z`) }, stage: { notIn: ["GANHO", "PERDIDO"] } }, select: { id: true, companyName: true, nextAction: true, nextActionAt: true } });
    for (const l of leads) events.push({ date: dbDateToLocalDate(l.nextActionAt!), kind: "LEAD", label: `${l.nextAction ?? "Retomar contato"} · ${l.companyName}`, href: `/crm/${l.id}` });
  }
  if (can(actor, "contracts.manage")) {
    const today = instantToLocalDate(new Date(), APP_TIMEZONE);
    const cs = await prisma.contract.findMany({ where: { organizationId: actor.organizationId, status: "ASSINADO", startDate: { not: null } }, select: { id: true, partyName: true, termMonths: true, startDate: true } });
    for (const c of cs) {
      const t = contractTimeline(dbDateToLocalDate(c.startDate!), c.termMonths, today);
      for (const [d, what] of [[t.termEnd, "Fim do prazo"], [t.nextAnniversary, "Reajuste anual"]] as const) if (d >= first && d < after) events.push({ date: d, kind: "CONTRATO", label: `${what} · ${c.partyName}`, href: `/contratos/${c.id}` });
    }
  }
  if (can(actor, "finance.view")) {
    const clients = await prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null, status: "ATIVO", monthlyFee: { not: null } }, select: { id: true, tradeName: true, billingDay: true, billingDay2: true } });
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (const c of clients) for (const d of [c.billingDay, c.billingDay2]) if (d) events.push({ date: makeLocalDate(y, m, Math.min(d, dim)), kind: "VENCIMENTO", label: `Vence mensalidade · ${c.tradeName}`, href: `/clientes/${c.id}?aba=financeiro` });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  return { first, days: new Date(Date.UTC(y, m, 0)).getUTCDate(), events, addDays };
}

/** Eventos do mês anterior até 3 meses à frente, prontos para o calendário externo. */
export async function feedEvents(actor: Actor, origin: string): Promise<IcsEvent[]> {
  const now = instantToLocalDate(new Date(), APP_TIMEZONE);
  const { y, m } = parseLocalDate(now);
  const out: IcsEvent[] = [];
  for (let delta = -1; delta <= 3; delta++) {
    const t = new Date(Date.UTC(y, m - 1 + delta, 1));
    const month = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
    const { events } = await agendaMonth(actor, month);
    for (const e of events) {
      const emoji = { REUNIAO: "🤝", TAREFA: "✅", LEAD: "📞", CONTRATO: "🔄", VENCIMENTO: "💰" }[e.kind as Exclude<AgendaEvent["kind"], "GOOGLE">];
      out.push({ uid: `${e.kind}-${e.href}-${e.date}@centralbpo`.replace(/[^\w@.:/-]/g, "_"), date: e.date, summary: `${emoji} ${e.label}`, url: origin + e.href });
    }
  }
  return out;
}

export async function getOrCreateFeedToken(actor: Actor, regenerate = false) {
  const existing = await prisma.agendaFeed.findUnique({ where: { userId: actor.userId } });
  if (existing && !regenerate) return existing.token;
  const token = randomBytes(24).toString("hex");
  await prisma.agendaFeed.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, organizationId: actor.organizationId, token },
    update: { token, createdAt: new Date() },
  });
  return token;
}

export async function disableFeed(actor: Actor) {
  await prisma.agendaFeed.deleteMany({ where: { userId: actor.userId } });
}
