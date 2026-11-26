import Link from "next/link";
import { headers } from "next/headers";
import { createFeedAction, disableFeedAction, removeImportAction } from "@/app/actions/agenda";
import { GoogleImportForm } from "@/components/google-import-form";
import { getImport, googleEvents } from "@/server/services/google-agenda";
import { CopyButton } from "@/components/copy-button";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/layout";
import { fmtLocalDate } from "@/lib/format";
import { monthLabel } from "@/components/closing-panel";
import { isCompetenceMonth, shiftMonth } from "@/domain/closing";
import { makeLocalDate, parseLocalDate, weekday } from "@/domain/dates";
import { requirePermission } from "@/server/context";
import { addDays } from "@/domain/dates";
import { agendaMonth, type AgendaEvent } from "@/server/services/agenda";
import { currentCompetence } from "@/server/services/closings";

export const metadata = { title: "Agenda" };

const STYLE: Record<AgendaEvent["kind"], { cls: string; emoji: string; label: string }> = {
  GOOGLE: { cls: "bg-blue-50 text-blue-800 ring-blue-200", emoji: "📅", label: "Google Agenda" },
  REUNIAO: { cls: "bg-violet-50 text-violet-800 ring-violet-200", emoji: "🤝", label: "Reunião" },
  TAREFA: { cls: "bg-sky-50 text-sky-800 ring-sky-200", emoji: "✅", label: "Prazo de tarefa" },
  LEAD: { cls: "bg-amber-50 text-amber-800 ring-amber-200", emoji: "📞", label: "Contato comercial" },
  CONTRATO: { cls: "bg-rose-50 text-rose-800 ring-rose-200", emoji: "🔄", label: "Contrato" },
  VENCIMENTO: { cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", emoji: "💰", label: "Vencimento de mensalidade" },
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const vista = sp.vista === "mes" ? "mes" : "semana";
  const month = isCompetenceMonth(sp.mes) ? sp.mes : currentCompetence();
  const refDay = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? (sp.dia as string) : todayKey;
  const weekStart = addDays(refDay, -weekday(refDay));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const baseMonth = vista === "semana" ? weekStart.slice(0, 7) : month;
  const { first, days, events: base } = await agendaMonth(actor, baseMonth);
  const extraMonth = vista === "semana" && weekDays[6].slice(0, 7) !== baseMonth ? await agendaMonth(actor, weekDays[6].slice(0, 7)) : null;
  const { y, m } = parseLocalDate(first);
  const lead = weekday(first);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const gFrom = vista === "semana" ? weekStart : first;
  const gTo = vista === "semana" ? addDays(weekStart, 7) : addDays(first, days);
  const google = await googleEvents(actor, gFrom, gTo);
  const events = [...base, ...(extraMonth?.events ?? []), ...google.events].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));
  const by = new Map<string, AgendaEvent[]>();
  for (const e of events) by.set(e.date, [...(by.get(e.date) ?? []), e]);
  const imp = await getImport(actor);
  const feed = await prisma.agendaFeed.findUnique({ where: { userId: actor.userId } });
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const feedUrl = feed ? `${proto}://${h.get("host")}/agenda/feed/${feed.token}.ics` : null;
  const href = (mm: string) => `/agenda?vista=mes&mes=${mm}`;
  const wk = (d: string) => `/agenda?dia=${d}`;
  return (
    <>
      <PageHeader title="Agenda" description="Reuniões, prazos, contatos comerciais, contratos e vencimentos de mensalidade, tudo no mesmo calendário." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {vista === "semana" ? (
          <>
            <Link href={wk(addDays(weekStart, -7))} className="btn-secondary btn-sm">←</Link>
            <h2 className="min-w-56 text-center text-base font-semibold text-brand-900">{fmtLocalDate(weekDays[0])} a {fmtLocalDate(weekDays[6])}</h2>
            <Link href={wk(addDays(weekStart, 7))} className="btn-secondary btn-sm">→</Link>
            <Link href="/agenda" className="btn-secondary btn-sm ml-2">Hoje</Link>
          </>
        ) : (
          <>
            <Link href={href(shiftMonth(month, -1))} className="btn-secondary btn-sm">←</Link>
            <h2 className="min-w-48 text-center text-base font-semibold text-brand-900">{monthLabel(month)}</h2>
            <Link href={href(shiftMonth(month, 1))} className="btn-secondary btn-sm">→</Link>
            <Link href="/agenda?vista=mes" className="btn-secondary btn-sm ml-2">Hoje</Link>
          </>
        )}
        <span className="ml-auto inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-medium">
          <Link href="/agenda" className={`px-3 py-1.5 ${vista === "semana" ? "bg-brand-900 text-white" : "bg-white text-slate-600"}`}>Semana</Link>
          <Link href="/agenda?vista=mes" className={`px-3 py-1.5 ${vista === "mes" ? "bg-brand-900 text-white" : "bg-white text-slate-600"}`}>Mês</Link>
        </span>
      </div>
      {google.error && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Não consegui ler o seu Google Agenda agora ({google.error}). Confira o endereço lá embaixo.</p>}
      <p className="mb-3 flex flex-wrap gap-2 text-xs">{Object.values(STYLE).map((s) => <span key={s.label} className={`rounded-md px-2 py-0.5 ring-1 ring-inset ${s.cls}`}>{s.emoji} {s.label}</span>)}</p>
      {vista === "semana" && (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((d, i) => {
            const list = by.get(d) ?? [];
            const today = d === todayKey;
            return (
              <section key={d} aria-label={d} className={`card min-h-40 p-2.5 ${today ? "ring-2 ring-sky-300" : ""}`}>
                <h3 className={`mb-2 text-xs font-semibold ${today ? "text-brand-700" : "text-slate-500"}`}>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i]} {d.slice(8)}</h3>
                {list.length ? (
                  <ul className="space-y-1.5">
                    {list.map((e, k) => (
                      <li key={k}>
                        <Link href={e.href} {...(e.external ? { target: "_blank", rel: "noreferrer" } : {})} className={`block rounded-md px-2 py-1.5 text-xs ring-1 ring-inset ${STYLE[e.kind].cls}`}>
                          {e.time && <span className="block font-semibold tabular-nums">{e.time}{e.endTime ? `–${e.endTime}` : ""}</span>}
                          <span className="line-clamp-3">{STYLE[e.kind].emoji} {e.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">Livre</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      {vista === "mes" && (
      <div className="card overflow-x-auto">
        <div className="grid min-w-[56rem] grid-cols-7 border-b border-hair bg-slate-50 text-center text-xs font-medium text-slate-500">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid min-w-[56rem] grid-cols-7">
          {cells.map((d, i) => {
            const key = d ? makeLocalDate(y, m, d) : "";
            const list = (d && by.get(key)) || [];
            return (
              <div key={i} className={`min-h-28 border-b border-r border-hair p-1.5 ${d ? "" : "bg-slate-50/60"} ${key === todayKey ? "bg-sky-50/50" : ""}`}>
                {d && <p className={`mb-1 text-xs ${key === todayKey ? "font-bold text-brand-700" : "text-slate-500"}`}>{d}</p>}
                <ul className="space-y-1">
                  {list.slice(0, 4).map((e, k) => <li key={k}><Link href={e.href} title={e.label} className={`block truncate rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${STYLE[e.kind].cls}`}>{e.time ? `${e.time} ` : ""}{STYLE[e.kind].emoji} {e.label}</Link></li>)}
                  {list.length > 4 && <li className="px-1 text-[11px] text-slate-500">+{list.length - 4} mais</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      )}
      <section className="card mt-4 p-4">
        <h2 className="text-sm font-semibold text-brand-900">📅 Trazer o seu Google Agenda para cá</h2>
        {imp ? (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <p>Conectado. Seus compromissos aparecem em azul e atualizam a cada 5 minutos.</p>
            <form action={removeImportAction}><button className="btn-secondary btn-sm">Desconectar</button></form>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">No Google Agenda (no computador): Configurações → sua agenda → “Integrar agenda” → copie o <strong>Endereço secreto no formato iCal</strong> e cole abaixo. Quem tiver o endereço lê a sua agenda, então não compartilhe.</p>
            <GoogleImportForm />
          </>
        )}
      </section>
      <section className="card mt-4 p-4">
        <h2 className="text-sm font-semibold text-brand-900">📲 Ver esta agenda no Google Agenda</h2>
        {feedUrl ? (
          <>
            <p className="mt-1 text-sm text-slate-600">No Google Agenda, abra “Outras agendas” → “Por URL” e cole o link abaixo. As reuniões, prazos e vencimentos aparecem lá, e o Google atualiza sozinho (pode levar algumas horas). É somente leitura.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input readOnly value={feedUrl} className="input min-w-0 flex-1 text-xs" />
              <CopyButton text={feedUrl} label="Copiar link" />
              <form action={createFeedAction.bind(null, true)}><button className="btn-secondary btn-sm" title="Gera outro link e desativa o atual">Gerar novo link</button></form>
              <form action={disableFeedAction}><button className="btn-secondary btn-sm">Desativar</button></form>
            </div>
            <p className="mt-2 text-xs text-slate-500">Quem tiver este link vê os seus compromissos. Não compartilhe; se vazar, gere um novo.</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Gere um link secreto e assine no Google Agenda ou em qualquer calendário que aceite iCal.</p>
            <form action={createFeedAction.bind(null, false)} className="mt-2"><button className="btn-primary btn-sm">Gerar link da agenda</button></form>
          </>
        )}
      </section>
    </>
  );
}
