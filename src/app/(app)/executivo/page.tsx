import Link from "next/link";
import { Gauge, Target, Trophy } from "lucide-react";
import { EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { HEALTH_LABEL } from "@/domain/health";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { cx } from "@/lib/ui";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/server/context";
import { executiveOverview } from "@/server/services/executive";

export const metadata = { title: "Painel executivo" };

export default async function ExecutivoPage() {
  const actor = await requirePermission("finance.view");
  const e = await executiveOverview(actor);
  const canSettings = can(actor, "org.settings");
  const goalLink = canSettings ? (
    <Link href="/configuracoes" className="font-medium text-brand-700 hover:underline">
      Definir em Configurações
    </Link>
  ) : (
    "Peça a um administrador para definir."
  );

  return (
    <>
      <PageHeader title="Painel executivo" description="A visão do dono: receita, margem, meta de crescimento e capacidade da equipe." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Receita mensal (MRR)" value={fmtMoney(e.mrr)} tone="success" hint={`Receita anual: ${fmtMoney(e.arr)}`} />
        <Stat label="Clientes ativos" value={e.activeClients} hint={`${e.implantationClients} em implantação`} href="/clientes" />
        <Stat label="Ticket médio" value={e.averageTicket === null ? "—" : fmtMoney(e.averageTicket)} hint="Receita por cliente ativo" />
        <Stat label="Margem do mês" value={e.marginPct === null ? "—" : `${e.marginPct}%`} tone={e.marginPct !== null && e.marginPct < 60 ? "warning" : "success"} hint={e.margin === null ? "Defina o custo da hora" : `${fmtMoney(e.margin)} sobre ${fmtMoney(e.cost)} de custo`} href="/carteira" />
        <Stat label="Tarefas atrasadas" value={e.overdueTasks} tone={e.overdueTasks ? "danger" : "default"} href="/tarefas" />
        <Stat label="Horas no mês" value={`${e.hours} h`} tone="info" hint="Apontadas pelo cronômetro" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Target aria-hidden className="h-4 w-4 text-amber-600" /> Meta de crescimento
          </h2>
          {!e.goal ? (
            <p className="text-sm text-slate-600">Nenhuma meta definida. {goalLink}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-semibold text-slate-900">{fmtMoney(e.mrr)}</p>
                <p className="text-sm text-slate-500">meta {fmtMoney(e.goal.value)}{e.goal.date ? ` até ${fmtLocalDate(e.goal.date)}` : ""}</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${e.goal.progress}%` }} />
              </div>
              <p className="text-sm text-slate-700">
                {e.goal.forecast?.reached
                  ? "Meta atingida."
                  : e.goal.forecast?.date
                    ? `No ritmo atual (${fmtMoney(e.goal.growthPerMonth)} de receita nova por mês, média de 90 dias), a meta é atingida em cerca de ${e.goal.forecast.months} mês(es), por volta de ${fmtLocalDate(e.goal.forecast.date)}.`
                    : "Sem previsão: não houve receita nova nos últimos 90 dias."}
              </p>
              {e.goal.date && e.goal.forecast && !e.goal.forecast.reached && e.goal.forecast.date && e.goal.forecast.date > e.goal.date && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">A previsão passa da data-alvo. Para chegar a tempo, é preciso fechar mais clientes ou subir o ticket.</p>
              )}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Gauge aria-hidden className="h-4 w-4 text-violet-600" /> Capacidade da equipe
          </h2>
          {!e.capacity ? (
            <p className="text-sm text-slate-600">Informe as horas produtivas da equipe para ver a ocupação. {goalLink}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-semibold text-slate-900">{e.capacity.occupancy}%</p>
                <p className="text-sm text-slate-500">de {e.capacityHours} h no mês</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={cx("h-full rounded-full", e.capacity.occupancy > 100 ? "bg-red-500" : e.capacity.occupancy > 85 ? "bg-amber-500" : "bg-violet-500")} style={{ width: `${Math.min(100, e.capacity.occupancy)}%` }} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><dd className="text-base font-semibold text-slate-900">{e.capacity.usedHours} h</dd><dt className="text-slate-500">usadas</dt></div>
                <div className="rounded-lg bg-slate-50 p-2"><dd className="text-base font-semibold text-slate-900">{e.capacity.plannedHours} h</dd><dt className="text-slate-500">previstas</dt></div>
                <div className="rounded-lg bg-slate-50 p-2"><dd className="text-base font-semibold text-slate-900">{e.capacity.freeHours} h</dd><dt className="text-slate-500">livres até 85%</dt></div>
              </dl>
              <p className="text-sm text-slate-700">
                {e.capacity.clientsThatFit === null
                  ? "Quando houver horas apontadas, mostro quantos clientes novos cabem."
                  : `Com ${e.capacity.hoursPerClient} h por cliente, cabem cerca de ${e.capacity.clientsThatFit} cliente(s) novo(s) sem passar de 85% de ocupação.`}
              </p>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Clientes que pedem atenção</h2>
          {e.atRisk.length === 0 ? (
            <EmptyState title="Tudo em dia" description="Nenhum cliente em atenção ou risco." />
          ) : (
            <ul className="space-y-2">
              {e.atRisk.map((h) => (
                <li key={h.id}>
                  <Link href={`/clientes/${h.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-500">
                    <span><span className="font-medium">{h.name}</span><span className="ml-2 text-xs text-slate-500">{h.reasons.join(" · ")}</span></span>
                    <span className={cx("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", h.level === "RISCO" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900")}>{HEALTH_LABEL[h.level]} · {h.score}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Trophy aria-hidden className="h-4 w-4 text-amber-600" /> Maiores clientes por receita
          </h2>
          {e.topClients.length === 0 ? (
            <p className="text-sm text-slate-500">Cadastre a mensalidade dos clientes para ver o ranking.</p>
          ) : (
            <ul className="space-y-2">
              {e.topClients.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">{i + 1}</span><Link href={`/clientes/${c.id}`} className="hover:underline">{c.tradeName}</Link></span>
                  <span className="tabular-nums text-slate-700">{fmtMoney(c.monthlyFee)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
