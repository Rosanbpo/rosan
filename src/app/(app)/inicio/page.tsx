import Link from "next/link";
import { STATUS_LABEL } from "@/domain/enums";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { homeOverview } from "@/server/services/home";

export const metadata = { title: "Início" };

const TONE_BOX = {
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  danger: "border-red-200 bg-red-50",
  info: "border-violet-200 bg-violet-50",
} as const;
const TONE_BTN = {
  success: "text-emerald-700 border-emerald-300",
  warning: "text-amber-800 border-amber-300",
  danger: "text-red-700 border-red-300",
  info: "text-violet-700 border-violet-300",
} as const;

function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(now));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Tile({ label, emoji, value, hint, cls, href }: { label: string; emoji: string; value: string; hint: string; cls: string; href?: string }) {
  const body = (
    <div className={`h-full rounded-xl border p-4 ${cls}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold">{label}</p>
        <span aria-hidden>{emoji}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-brand-900 xl:text-[1.7rem]">{value}</p>
      <p className="text-xs opacity-80">{hint}</p>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default async function InicioPage() {
  const actor = await requirePermission("dashboard.view");
  const now = new Date();
  const d = await homeOverview(actor, now);
  const first = actor.name.split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(now);
  const total = Math.max(1, d.byStatus.reduce((a, s) => a + s.count, 0));

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-brand-900">{greeting(now)}, {first}! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">{dateLabel} · {d.dueToday} tarefa{d.dueToday === 1 ? "" : "s"} para hoje</p>
      </header>

      <section aria-label="Insights da operação" className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900">💡 Insights da operação <span className="rounded-full bg-slate-200 px-2 text-xs">{d.insights.length}</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {d.insights.map((i) => (
            <div key={i.title} className={`rounded-xl border p-4 ${TONE_BOX[i.tone]}`}>
              <p className="font-semibold text-brand-900"><span aria-hidden>{i.emoji}</span> {i.title}</p>
              <p className="mt-1 text-sm text-slate-600">{i.text}</p>
              <Link href={i.href} className={`mt-2 inline-block rounded-md border bg-white/60 px-2 py-0.5 text-xs font-medium ${TONE_BTN[i.tone]}`}>{i.cta} →</Link>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Tile label="MRR" emoji="💰" value={d.mrr === null ? "—" : fmtMoney(d.mrr)} hint={`${d.activeClients} clientes ativos`} cls="border-sky-200 bg-sky-50 text-sky-800" href="/carteira" />
        <Tile label="Para hoje" emoji="☀️" value={String(d.dueToday)} hint="vencem hoje" cls="border-amber-200 bg-amber-50 text-amber-800" href="/tarefas?prazo=hoje" />
        <Tile label="Atrasadas" emoji="🔴" value={String(d.overdue)} hint="precisam de atenção" cls="border-red-200 bg-red-50 text-red-700" href="/tarefas?atrasadas=1" />
        <Tile label="Pendências" emoji="📋" value={String(d.waitingClient)} hint="aguardando cliente" cls="border-orange-200 bg-orange-50 text-orange-800" href="/pendencias" />
        <Tile label="Onboarding" emoji="🚀" value={String(d.onboarding)} hint="em implantação" cls="border-violet-200 bg-violet-50 text-violet-800" href="/esteiras" />
        <Tile label="Abertas" emoji="🗂️" value={String(d.openTotal)} hint="tarefas em aberto" cls="border-slate-200 bg-white text-slate-700" href="/tarefas" />
        <Tile label="Horas hoje" emoji="⏱️" value={`${d.hoursToday}h`} hint="apontadas" cls="border-teal-200 bg-teal-50 text-teal-800" />
      </div>

      <section className="card mb-5">
        <div className="flex items-center justify-between border-b border-hair px-5 py-3">
          <h2 className="text-[15px] font-semibold text-brand-900">🏢 Tarefas por cliente</h2>
          <Link href="/clientes" className="text-sm text-brand-700 hover:underline">Ver clientes →</Link>
        </div>
        {d.byClient.length ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {d.byClient.map((c) => (
              <div key={c.id ?? "interna"} className="rounded-xl border border-hair p-4">
                <div className="flex items-start justify-between gap-2">
                  {c.id ? <Link href={`/clientes/${c.id}`} className="font-semibold text-brand-900 hover:underline">{c.name}</Link> : <span className="font-semibold text-brand-900">{c.name}</span>}
                  <span className="text-xs text-slate-500">{c.open} aberta{c.open === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-1 flex gap-3 text-xs">
                  <span className={c.overdue ? "font-semibold text-red-700" : "text-slate-400"}>🔴 {c.overdue} atrasada{c.overdue === 1 ? "" : "s"}</span>
                  <span className={c.today ? "font-semibold text-amber-700" : "text-slate-400"}>☀️ {c.today} hoje</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {c.next.map((t) => (
                    <li key={t.id} className="truncate"><Link href={`/tarefas/${t.id}`} className="hover:underline">• {t.title}</Link></li>
                  ))}
                </ul>
                {c.id && <Link href={`/tarefas?clientId=${c.id}&abertas=1`} className="mt-2 inline-block text-xs text-brand-700 hover:underline">Ver todas →</Link>}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">🎉 Nenhuma tarefa em aberto.</p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between border-b border-hair px-5 py-3">
            <h2 className="text-[15px] font-semibold text-brand-900">☀️ Para fazer hoje</h2>
            <Link href="/tarefas?prazo=hoje" className="text-sm text-brand-700 hover:underline">Ver todas →</Link>
          </div>
          {d.todayList.length ? (
            <ul className="divide-y divide-hair">
              {d.todayList.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/tarefas/${t.id}`} className="block truncate font-medium hover:underline">{t.title}</Link>
                    <p className="truncate text-xs text-slate-500">{t.client?.tradeName ?? "Interna"}</p>
                  </div>
                  <span className={`shrink-0 text-xs ${t.dueAt && t.dueAt < now ? "font-semibold text-red-700" : "text-slate-500"}`}>{fmtDateTime(t.dueAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-slate-500">Nada pendente para hoje. ✨</p>
          )}
        </section>

        <section className="card">
          <div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">📊 Distribuição de tarefas</h2></div>
          <ul className="space-y-3 p-5">
            {d.byStatus.map((s) => (
              <li key={s.status}>
                <div className="flex justify-between text-sm"><span>{STATUS_LABEL[s.status]}</span><span className="text-slate-500">{s.count} ({Math.round((s.count / total) * 100)}%)</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.count / total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-hair px-5 py-3">
            <h2 className="text-[15px] font-semibold text-brand-900">📅 Próximos 7 dias</h2>
            <Link href="/tarefas?prazo=7dias" className="text-sm text-brand-700 hover:underline">Ver todas →</Link>
          </div>
          {d.next7.length ? (
            <ul className="divide-y divide-hair">
              {d.next7.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0"><Link href={`/tarefas/${t.id}`} className="block truncate font-medium hover:underline">{t.title}</Link><p className="text-xs text-slate-500">{t.client?.tradeName ?? "Interna"}</p></div>
                  <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(t.dueAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-sm text-slate-500">Nada previsto para os próximos 7 dias.</p>}
        </section>
      </div>

      <p className="mt-5 text-sm"><Link href="/painel" className="text-brand-700 hover:underline">Abrir painel detalhado do gestor →</Link></p>
    </>
  );
}
