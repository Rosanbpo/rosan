import { startOfToday } from "@/domain/dates";
import { JOURNEY_STAGES, STAGE_LABEL } from "@/domain/enums";
import Link from "next/link";
import { STATUS_LABEL } from "@/domain/enums";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { homeOverview } from "@/server/services/home";
import { diagnosisInbox } from "@/server/services/diagnosis";
import { managerDashboard } from "@/server/services/dashboard";
import { TaskTable } from "@/components/task-table";
import { fmtMinutes } from "@/lib/format";

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
    <div className={`h-full rounded-lg border p-3 ${cls}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold">{label}</p>
        <span aria-hidden>{emoji}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-brand-900">{value}</p>
      <p className="text-xs opacity-80">{hint}</p>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default async function InicioPage() {
  const actor = await requirePermission("dashboard.view");
  const now = new Date();
  const [d, m, dx] = await Promise.all([homeOverview(actor, now), managerDashboard(actor, {}, now), diagnosisInbox(actor)]);
  const maxLoad = Math.max(1, ...m.workload.map((w) => w.open));
  const first = actor.name.split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(now);
  const total = Math.max(1, d.byStatus.reduce((a, s) => a + s.count, 0));

  return (
    <div className="text-[13px] [&_.text-sm]:text-[13px]">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-brand-900">{greeting(now)}, {first}! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">{dateLabel} · {d.dueToday} tarefa{d.dueToday === 1 ? "" : "s"} para hoje</p>
      </header>

      {dx.unseen.length > 0 && (
        <section className="mb-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4" role="status" aria-label="Diagnósticos respondidos">
          <h2 className="text-[15px] font-bold text-emerald-900">🎉 {dx.unseen.length === 1 ? "1 cliente respondeu o diagnóstico!" : `${dx.unseen.length} clientes responderam o diagnóstico!`}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {dx.unseen.map((u) => (
              <li key={u.clientId}>
                <Link href={`/clientes/${u.clientId}?aba=dados`} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
                  {u.name} <span className="text-xs font-normal text-emerald-700">· {fmtDateTime(u.at)}</span> <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">Ver respostas</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {dx.waiting.length > 0 && (
        <details className="card group mb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
            <h2 className="text-[15px] font-semibold text-brand-900">📝 Diagnósticos aguardando resposta <span className="ml-1 rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800">{dx.waiting.length}</span></h2>
            <span className="text-sm text-brand-700 group-open:hidden">Mostrar ▾</span>
            <span className="hidden text-sm text-brand-700 group-open:inline">Esconder ▴</span>
          </summary>
          <ul className="divide-y divide-hair border-t border-hair">
            {dx.waiting.map((w) => (
              <li key={w.clientId} className="flex items-center justify-between gap-3 px-5 py-2 text-sm">
                <Link href={`/clientes/${w.clientId}?aba=jornada`} className="font-medium text-brand-700 hover:underline">{w.name}</Link>
                <span className="text-xs text-slate-500">link enviado {w.since ? `em ${fmtDateTime(w.since)}` : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section aria-label="Insights da operação" className="mb-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-900">💡 Insights da operação <span className="rounded-full bg-slate-200 px-2 text-xs">{d.insights.length}</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {d.insights.map((i) => (
            <div key={i.title} className={`rounded-lg border px-4 py-3 ${TONE_BOX[i.tone]}`}>
              <p className="font-semibold text-brand-900"><span aria-hidden>{i.emoji}</span> {i.title}</p>
              <p className="mt-1 text-sm text-slate-600">{i.text}</p>
              <Link href={i.href} className={`mt-2 inline-block rounded-md border bg-white/60 px-2 py-0.5 text-xs font-medium ${TONE_BTN[i.tone]}`}>{i.cta} →</Link>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Tile label="MRR" emoji="💰" value={d.mrr === null ? "—" : fmtMoney(d.mrr)} hint={`${d.activeClients} clientes ativos`} cls="border-sky-200 bg-sky-50 text-sky-800" href="/carteira" />
        <Tile label="Para hoje" emoji="☀️" value={String(d.dueToday)} hint="vencem hoje" cls="border-amber-200 bg-amber-50 text-amber-800" href="/hoje" />
        <Tile label="Atrasadas" emoji="🔴" value={String(d.overdue)} hint="precisam de atenção" cls="border-red-200 bg-red-50 text-red-700" href="/tarefas?atrasadas=1" />
        <Tile label="Pendências" emoji="📋" value={String(d.waitingClient)} hint="aguardando cliente" cls="border-orange-200 bg-orange-50 text-orange-800" href="/pendencias" />
        <Tile label="Diagnósticos" emoji="📝" value={String(dx.waiting.length)} hint="aguardando resposta" cls="border-amber-200 bg-amber-50 text-amber-800" />
        <Tile label="Onboarding" emoji="🚀" value={String(d.onboarding)} hint="em implantação" cls="border-violet-200 bg-violet-50 text-violet-800" href="/biblioteca?secao=jornada" />
        <Tile label="Abertas" emoji="🗂️" value={String(d.openTotal)} hint="tarefas em aberto" cls="border-slate-200 bg-white text-slate-700" href="/tarefas" />
        <Tile label="Horas hoje" emoji="⏱️" value={`${d.hoursToday}h`} hint="apontadas" cls="border-teal-200 bg-teal-50 text-teal-800" />
      </div>

      <details className="card group mb-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
          <h2 className="text-[15px] font-semibold text-brand-900">🧭 Jornada dos clientes</h2>
          <span className="flex items-center gap-3 text-sm text-slate-500">
            <span>{JOURNEY_STAGES.reduce((n, st) => n + (d.journey[st]?.length ?? 0), 0)} clientes</span>
            <span className="text-brand-700 group-open:hidden">Mostrar ▾</span>
            <span className="hidden text-brand-700 group-open:inline">Esconder ▴</span>
          </span>
        </summary>
        <div className="border-t border-hair px-5 pt-2 text-right"><Link href="/biblioteca?secao=jornada" className="text-sm text-brand-700 hover:underline">Ver esteiras →</Link></div>
        <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-8">
          {JOURNEY_STAGES.map((st) => {
            const list = d.journey[st] ?? [];
            return (
              <div key={st} className={`rounded-lg border p-2.5 ${list.length ? "border-brand-200 bg-brand-50/40" : "border-hair bg-slate-50/60"}`}>
                <p className="text-[11px] font-medium text-slate-500">{STAGE_LABEL[st]}</p>
                <p className={`text-xl font-bold ${list.length ? "text-brand-900" : "text-slate-300"}`}>{list.length}</p>
                <ul className="mt-1 space-y-0.5">
                  {list.slice(0, 3).map((c) => <li key={c.id}><Link href={`/clientes/${c.id}`} className="block truncate text-[12px] text-brand-700 hover:underline">{c.name}</Link></li>)}
                  {list.length > 3 && <li className="text-[11px] text-slate-500">+{list.length - 3}</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </details>

      <section className="card mb-4">
        <div className="flex items-center justify-between border-b border-hair px-5 py-3">
          <h2 className="text-[15px] font-semibold text-brand-900">🏢 Tarefas por cliente</h2>
          <Link href="/clientes" className="text-sm text-brand-700 hover:underline">Ver clientes →</Link>
        </div>
        {d.byClient.length ? (
          <div className="grid gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {d.byClient.map((c) => {
              const initials = c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
              return (
                <Link
                  key={c.id ?? "interna"}
                  href={c.id ? `/clientes/${c.id}?aba=hoje` : "/avulsas"}
                  className="group flex items-center gap-3 rounded-xl border border-hair bg-white p-3 transition-colors hover:border-brand-700 hover:bg-brand-50/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hair bg-brand-50 text-sm font-semibold text-brand-700">
                    {c.hasLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/clientes/${c.id}/logo`} alt="" className="h-full w-full bg-white object-contain" />
                    ) : (
                      initials
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-brand-900">{c.name}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                      {c.overdue > 0 && <span className="font-semibold text-red-700">{c.overdue} atrasada{c.overdue === 1 ? "" : "s"}</span>}
                      {c.today > 0 && <span className="font-semibold text-amber-700">{c.today} hoje</span>}
                      {c.overdue === 0 && c.today === 0 && <span className="text-slate-400">em dia</span>}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 tabular-nums" title="tarefas em aberto">{c.open}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">🎉 Nenhuma tarefa em aberto.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
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
                  <span className={`shrink-0 text-xs ${t.dueAt && t.dueAt < startOfToday(now) ? "font-semibold text-red-700" : "text-slate-500"}`}>{fmtDateTime(t.dueAt)}</span>
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

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="card"><div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">🔴 Tarefas atrasadas</h2></div>
          {m.overdue.rows.length ? <TaskTable rows={m.overdue.rows} compact showAssignee={false} caption="Tarefas atrasadas" /> : <p className="p-5 text-sm text-slate-500">Nenhuma tarefa atrasada. 🎉</p>}
        </section>
        <section className="card"><div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">🔍 Em revisão</h2></div>
          {m.review.rows.length ? <TaskTable rows={m.review.rows} compact showAssignee={false} caption="Tarefas em revisão" /> : <p className="p-5 text-sm text-slate-500">Nenhuma tarefa em revisão.</p>}
        </section>
        <section className="card"><div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">⏳ Aguardando cliente</h2></div>
          {m.waitingClient.rows.length ? <TaskTable rows={m.waitingClient.rows} compact showAssignee={false} caption="Tarefas aguardando cliente" /> : <p className="p-5 text-sm text-slate-500">Nenhuma tarefa aguardando cliente.</p>}
        </section>
        <section className="card"><div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">👥 Carga por operador</h2></div>
          {m.workload.length ? (
            <ul className="space-y-3 p-5">
              {m.workload.map((w) => (
                <li key={w.assigneeId ?? "none"}>
                  <div className="flex items-center justify-between text-sm"><span className="font-medium">{w.name}</span><span className="text-xs text-slate-600">{w.open} abertas · <span className={w.overdue ? "font-semibold text-red-700" : ""}>{w.overdue} atrasadas</span> · {fmtMinutes(w.estimatedMinutes)}</span></div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className="bg-red-500" style={{ width: `${(w.overdue / maxLoad) * 100}%` }} /><div className="bg-brand-500" style={{ width: `${((w.open - w.overdue) / maxLoad) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-sm text-slate-500">Sem tarefas abertas.</p>}
        </section>
      </div>
    </div>
  );
}
