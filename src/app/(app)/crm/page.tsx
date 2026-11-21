import Link from "next/link";
import { Plus } from "lucide-react";
import { LEAD_STAGES, LEAD_STAGE_LABEL, LEAD_STAGE_PROBABILITY, type LeadStage } from "@/domain/enums";
import { instantToLocalDate } from "@/domain/dates";
import { EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { fmtLocalDate, fmtMoney, fmtPercent } from "@/lib/format";
import { cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { str } from "@/server/page-utils";
import { listLeads, listMyMessageTemplates } from "@/server/services/leads";
import { MessageButton, MessageDialog, TemplatesButton } from "@/components/crm-messages";
import { DAILY_LEAD_GOAL } from "@/domain/crm-messages";
import { addDays } from "@/domain/dates";
import { advanceLeadAction } from "@/app/actions/crm";

export const metadata = { title: "CRM comercial" };

type SP = Record<string, string | string[] | undefined>;

const STAGE_EMOJI: Record<LeadStage, string> = { NOVO: "🆕", CONTATO: "📞", REUNIAO: "🤝", PROPOSTA: "📄", NEGOCIACAO: "💬", GANHO: "🏆", PERDIDO: "❌" };
const NEXT: Partial<Record<LeadStage, LeadStage>> = { NOVO: "CONTATO", CONTATO: "REUNIAO", REUNIAO: "PROPOSTA", PROPOSTA: "NEGOCIACAO", NEGOCIACAO: "GANHO" };
const wa = (phone: string | null) => { const d = (phone ?? "").replace(/\D/g, ""); return d.length >= 10 ? `https://wa.me/${d.length <= 11 ? "55" + d : d}` : null; };

const COLUMN_TONE: Record<LeadStage, string> = {
  NOVO: "border-t-slate-400",
  CONTATO: "border-t-sky-400",
  REUNIAO: "border-t-indigo-400",
  PROPOSTA: "border-t-amber-500",
  NEGOCIACAO: "border-t-orange-500",
  GANHO: "border-t-emerald-500",
  PERDIDO: "border-t-zinc-400",
};

const days = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

export default async function CrmPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("crm.manage");
  const sp = await searchParams;
  const q = str(sp, "q");
  const [{ leads, forecast, conversion, won, lost }, mine] = await Promise.all([listLeads(actor, { q }), listMyMessageTemplates(actor)]);
  const lista = str(sp, "vista") === "lista";
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const showClosed = str(sp, "encerrados") === "1";
  const stages = LEAD_STAGES.filter((s) => showClosed || (s !== "GANHO" && s !== "PERDIDO"));
  const active = leads.filter((l) => l.stage !== "GANHO" && l.stage !== "PERDIDO");
  const month = today.slice(0, 7);
  const wonFee = leads.filter((l) => l.stage === "GANHO" && l.closedAt && instantToLocalDate(l.closedAt, APP_TIMEZONE).startsWith(month));
  const createdOn = (day: string) => leads.filter((l) => instantToLocalDate(l.createdAt, APP_TIMEZONE) === day).length;
  const todayNew = createdOn(today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { d, n: createdOn(d) };
  });
  const due = leads.filter((l) => l.nextActionAt && l.nextActionAt <= today && l.stage !== "GANHO" && l.stage !== "PERDIDO");
  const overdueActions = leads.filter((l) => l.nextActionAt && l.nextActionAt < today && l.stage !== "GANHO" && l.stage !== "PERDIDO").length;

  return (
    <>
      <PageHeader title="CRM Comercial" description="Funil de novos clientes, do primeiro contato ao contrato." />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pipeline ativo" value={fmtMoney(forecast.openFee)} hint={`${active.length} leads`} tone="info" />
        <Stat label="Receita mensal fechada" value={fmtMoney(wonFee.reduce((a, l) => a + (l.expectedFee ?? 0), 0))} hint={`${wonFee.length} clientes no mês`} tone="success" />
        <Stat label="Taxa de conversão" value={fmtPercent(conversion)} hint={`${lost} perdidos`} tone="warning" />
        <Stat label="Follow-ups hoje" value={due.length} tone={overdueActions ? "danger" : "default"} hint={overdueActions ? `${overdueActions} atrasados` : "em dia"} />
      </div>

      <section className="card mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4" aria-label="Meta diária de leads">
        <div className="min-w-48">
          <p className="text-xs font-medium text-slate-500">🎯 Meta de hoje: {DAILY_LEAD_GOAL} leads novos</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
            {todayNew}<span className="text-base font-medium text-slate-400"> / {DAILY_LEAD_GOAL}</span>
          </p>
          <p className={cx("text-xs", todayNew >= DAILY_LEAD_GOAL ? "font-medium text-emerald-700" : "text-slate-500")}>
            {todayNew >= DAILY_LEAD_GOAL ? "Meta batida! 🎉" : `Faltam ${DAILY_LEAD_GOAL - todayNew} para bater a meta`}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={todayNew} aria-valuemin={0} aria-valuemax={DAILY_LEAD_GOAL}>
            <div className={cx("h-full rounded-full", todayNew >= DAILY_LEAD_GOAL ? "bg-emerald-500" : "bg-brand-600")} style={{ width: `${Math.min(100, (todayNew / DAILY_LEAD_GOAL) * 100)}%` }} />
          </div>
        </div>
        <ul className="flex items-end gap-2" aria-label="Leads novos nos últimos 7 dias">
          {week.map(({ d, n }) => (
            <li key={d} className="flex w-9 flex-col items-center gap-1 text-[11px] text-slate-500">
              <span className={cx("flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold", n >= DAILY_LEAD_GOAL ? "bg-emerald-100 text-emerald-800" : n > 0 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-300")}>{n}</span>
              {d.slice(8)}/{d.slice(5, 7)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">Verde = meta batida no dia.</p>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm" role="tablist" aria-label="Forma de ver">
          <Link href={`/crm${q ? `?q=${encodeURIComponent(q)}` : ""}`} role="tab" aria-selected={!lista} className={cx("px-3 py-1.5", !lista ? "bg-brand-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>▦ Kanban</Link>
          <Link href={`/crm?vista=lista${q ? `&q=${encodeURIComponent(q)}` : ""}`} role="tab" aria-selected={lista} className={cx("px-3 py-1.5", lista ? "bg-brand-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>☰ Lista</Link>
        </div>
        <form className="min-w-48 flex-1" role="search">
          {lista && <input type="hidden" name="vista" value="lista" />}
          <input name="q" defaultValue={q} placeholder="Buscar por nome, contato…" className="input" aria-label="Buscar lead" />
        </form>
        <TemplatesButton mine={mine.map((m) => ({ id: m.id, title: m.title, stage: m.stage, body: m.body }))} />
        <Link href="/crm/novo" className="btn-primary">
          <Plus aria-hidden className="h-4 w-4" /> Novo lead
        </Link>
      </div>
      <MessageDialog me={actor.name} org="Rosan Finanças" mine={mine.map((m) => ({ id: m.id, title: m.title, stage: m.stage, body: m.body }))} />

      {due.length > 0 && (
        <section className="card mb-6">
          <div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">📞 Para fazer agora ({due.length})</h2></div>
          <ul className="divide-y divide-hair">
            {due.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/crm/${l.id}`} className="font-medium hover:underline">{l.companyName}</Link>
                  <p className="text-xs text-slate-500">{l.nextAction ?? "Retomar contato"}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={l.nextActionAt! < today ? "font-semibold text-red-700" : "text-amber-700"}>{l.nextActionAt! < today ? "Atrasada · " : "Hoje · "}{fmtLocalDate(l.nextActionAt)}</span>
                  {wa(l.contactPhone) && <a href={wa(l.contactPhone)!} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">💬 WhatsApp</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {leads.length === 0 ? (
        <EmptyState
          title="Nenhum lead ainda"
          description="Cadastre o primeiro contato comercial para acompanhar o funil."
          action={<Link href="/crm/novo" className="btn-primary">Cadastrar lead</Link>}
        />
      ) : lista ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Empresa</th><th>Contato</th><th>Etapa</th><th>Mensalidade</th><th>Próxima ação</th><th>Mensagem</th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/crm/${l.id}`} className="font-medium hover:underline">{l.companyName}</Link></td>
                  <td>{l.contactName ?? "—"}</td>
                  <td>{STAGE_EMOJI[l.stage]} {LEAD_STAGE_LABEL[l.stage]}</td>
                  <td className="tabular-nums">{fmtMoney(l.expectedFee)}</td>
                  <td>{l.nextAction ?? "—"}{l.nextActionAt && ` · ${fmtLocalDate(l.nextActionAt)}`}</td>
                  <td><MessageButton lead={{ id: l.id, stage: l.stage, name: (l.contactName ?? l.companyName).split(" ")[0], company: l.companyName, phone: l.contactPhone, value: fmtMoney(l.expectedFee) }} className="btn-secondary btn-sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(15rem, 1fr))` }}>
          {stages.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const total = items.reduce((a, l) => a + (l.expectedFee ?? 0), 0);
            return (
              <section key={stage} aria-label={LEAD_STAGE_LABEL[stage]} className={cx("rounded-lg border border-t-4 border-slate-200 bg-slate-100/60", COLUMN_TONE[stage])}>
                <header className="px-3 py-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {STAGE_EMOJI[stage]} {LEAD_STAGE_LABEL[stage]} <span className="font-normal text-slate-500">({items.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {fmtMoney(total)}
                    {stage !== "GANHO" && stage !== "PERDIDO" && ` · chance ${Math.round(LEAD_STAGE_PROBABILITY[stage] * 100)}%`}
                  </p>
                </header>
                <ul className="space-y-2 p-2">
                  {items.map((l) => {
                    const late = l.nextActionAt && l.nextActionAt < today && stage !== "GANHO" && stage !== "PERDIDO";
                    return (
                      <li key={l.id}>
                        <Link href={`/crm/${l.id}`} className="card block p-3 hover:shadow-md">
                          <p className="text-sm font-medium text-slate-900">{l.companyName}</p>
                          {l.contactName && <p className="text-xs text-slate-500">{l.contactName}</p>}
                          <p className="mt-1 text-sm tabular-nums text-slate-700">{fmtMoney(l.expectedFee)}</p>
                          {l.nextAction && (
                            <p className={cx("mt-1 text-xs", late ? "font-semibold text-red-700" : "text-slate-600")}>
                              {l.nextAction}
                              {l.nextActionAt && ` · ${fmtLocalDate(l.nextActionAt)}`}
                            </p>
                          )}
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                            {l.ownerName && <span>👤 {l.ownerName}</span>}
                            {l.source && <span>📍 {l.source}</span>}
                            {stage !== "GANHO" && stage !== "PERDIDO" && days(l.updatedAt) >= 7 && <span className="font-medium text-amber-700">🕒 parado há {days(l.updatedAt)} dias</span>}
                          </p>
                        </Link>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <MessageButton lead={{ id: l.id, stage: l.stage, name: (l.contactName ?? l.companyName).split(" ")[0], company: l.companyName, phone: l.contactPhone, value: fmtMoney(l.expectedFee) }} className="text-xs text-emerald-700 hover:underline" />
                        </div>
                        {NEXT[stage] && (
                          <form action={advanceLeadAction.bind(null, l.id, NEXT[stage]!)} className="mt-1 text-right">
                            <button type="submit" className="text-xs text-brand-700 hover:underline">Avançar para {LEAD_STAGE_LABEL[NEXT[stage]!]} →</button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
