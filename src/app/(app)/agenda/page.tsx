import Link from "next/link";
import { headers } from "next/headers";
import { createFeedAction, disableFeedAction } from "@/app/actions/agenda";
import { CopyButton } from "@/components/copy-button";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/layout";
import { monthLabel } from "@/components/closing-panel";
import { isCompetenceMonth, shiftMonth } from "@/domain/closing";
import { makeLocalDate, parseLocalDate, weekday } from "@/domain/dates";
import { requirePermission } from "@/server/context";
import { agendaMonth, type AgendaEvent } from "@/server/services/agenda";
import { currentCompetence } from "@/server/services/closings";

export const metadata = { title: "Agenda" };

const STYLE: Record<AgendaEvent["kind"], { cls: string; emoji: string; label: string }> = {
  REUNIAO: { cls: "bg-violet-50 text-violet-800 ring-violet-200", emoji: "🤝", label: "Reunião" },
  TAREFA: { cls: "bg-sky-50 text-sky-800 ring-sky-200", emoji: "✅", label: "Prazo de tarefa" },
  LEAD: { cls: "bg-amber-50 text-amber-800 ring-amber-200", emoji: "📞", label: "Contato comercial" },
  CONTRATO: { cls: "bg-rose-50 text-rose-800 ring-rose-200", emoji: "🔄", label: "Contrato" },
  VENCIMENTO: { cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", emoji: "💰", label: "Vencimento de mensalidade" },
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const month = isCompetenceMonth(sp.mes) ? sp.mes : currentCompetence();
  const { first, days, events } = await agendaMonth(actor, month);
  const { y, m } = parseLocalDate(first);
  const lead = weekday(first);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const by = new Map<string, AgendaEvent[]>();
  for (const e of events) by.set(e.date, [...(by.get(e.date) ?? []), e]);
  const feed = await prisma.agendaFeed.findUnique({ where: { userId: actor.userId } });
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const feedUrl = feed ? `${proto}://${h.get("host")}/agenda/feed/${feed.token}.ics` : null;
  const href = (mm: string) => `/agenda?mes=${mm}`;
  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return (
    <>
      <PageHeader title="Agenda" description="Reuniões, prazos, contatos comerciais, contratos e vencimentos de mensalidade, tudo no mesmo calendário." />
      <div className="mb-4 flex items-center gap-2">
        <Link href={href(shiftMonth(month, -1))} className="btn-secondary btn-sm">←</Link>
        <h2 className="min-w-48 text-center text-base font-semibold text-brand-900">{monthLabel(month)}</h2>
        <Link href={href(shiftMonth(month, 1))} className="btn-secondary btn-sm">→</Link>
        <Link href="/agenda" className="btn-secondary btn-sm ml-2">Hoje</Link>
      </div>
      <p className="mb-3 flex flex-wrap gap-2 text-xs">{Object.values(STYLE).map((s) => <span key={s.label} className={`rounded-md px-2 py-0.5 ring-1 ring-inset ${s.cls}`}>{s.emoji} {s.label}</span>)}</p>
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
                  {list.slice(0, 4).map((e, k) => <li key={k}><Link href={e.href} title={e.label} className={`block truncate rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${STYLE[e.kind].cls}`}>{STYLE[e.kind].emoji} {e.label}</Link></li>)}
                  {list.length > 4 && <li className="px-1 text-[11px] text-slate-500">+{list.length - 4} mais</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
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
