import Link from "next/link";
import { CalendarClock, HeartPulse } from "lucide-react";
import { EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { HEALTH_LABEL, type HealthLevel } from "@/domain/health";
import { fmtDateTime, fmtHours } from "@/lib/format";
import { cx } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { centralOverview } from "@/server/services/central";

export const metadata = { title: "Central operacional" };

const LEVEL: Record<HealthLevel, { bar: string; chip: string }> = {
  SAUDAVEL: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
  ATENCAO: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-900" },
  RISCO: { bar: "bg-red-500", chip: "bg-red-100 text-red-800" },
};

export default async function CentralPage() {
  const actor = await requirePermission("dashboard.view");
  const c = await centralOverview(actor);
  const doneRoutines = c.routines.filter((r) => r.status === "CONCLUIDA").length;
  const counts = { SAUDAVEL: 0, ATENCAO: 0, RISCO: 0 } as Record<HealthLevel, number>;
  for (const h of c.health) counts[h.level]++;
  const plan: Array<{ key: "today" | "week" | "month30" | "eom"; label: string }> = [
    { key: "today", label: "Hoje" },
    { key: "week", label: "Próximos 7 dias" },
    { key: "month30", label: "Próximos 30 dias" },
    { key: "eom", label: "Até o fim do mês" },
  ];

  return (
    <>
      <PageHeader title="Central operacional" description="O pulso da operação: como estão os clientes, o que precisa rodar hoje e quanto trabalho vem pela frente." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Clientes saudáveis" value={counts.SAUDAVEL} tone="success" hint="Nota 80 a 100" />
        <Stat label="Em atenção" value={counts.ATENCAO} tone="warning" hint="Nota 60 a 79" />
        <Stat label="Em risco" value={counts.RISCO} tone="danger" hint="Nota abaixo de 60" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-900">
            <HeartPulse aria-hidden className="h-4 w-4 text-red-500" /> Saúde dos clientes
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            A nota considera tarefas atrasadas, pendências abertas, documentos do mês anterior que faltam e a pontualidade dos últimos 30 dias. Os piores aparecem primeiro.
          </p>
          {c.health.length === 0 ? (
            <EmptyState title="Nenhum cliente ativo" description="Cadastre clientes e aplique uma esteira para começar." />
          ) : (
            <ul className="space-y-3">
              {c.health.map((h) => (
                <li key={h.id}>
                  <Link href={`/clientes/${h.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-brand-500">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">{h.name}</span>
                      <span className={cx("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", LEVEL[h.level].chip)}>
                        {HEALTH_LABEL[h.level]} · {h.score}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={cx("h-full rounded-full", LEVEL[h.level].bar)} style={{ width: `${h.score}%` }} />
                    </div>
                    {h.reasons.length > 0 && <p className="mt-1.5 text-xs text-slate-500">{h.reasons.join(" · ")}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
              <CalendarClock aria-hidden className="h-4 w-4 text-sky-600" /> Planejamento do trabalho
            </h2>
            <ul className="divide-y divide-slate-100">
              {plan.map((p) => {
                const v = c.planning[p.key];
                return (
                  <li key={p.key} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">{p.label}</span>
                    <span className="text-right">
                      <strong className="tabular-nums text-slate-900">{v.tasks}</strong> <span className="text-slate-500">tarefas</span>
                      <span className="ml-2 text-xs text-slate-500">{v.minutes ? `~${fmtHours(v.minutes)}` : "sem estimativa"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Tarefas abertas por prazo, com a soma das horas estimadas.</p>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">Rotinas de hoje</h2>
              <span className="text-xs font-medium text-slate-600">
                {doneRoutines}/{c.routines.length} feitas
              </span>
            </div>
            {c.routines.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma rotina para hoje.</p>
            ) : (
              <ul className="max-h-96 space-y-1.5 overflow-y-auto">
                {c.routines.map((r) => (
                  <li key={r.id}>
                    <Link href={`/tarefas/${r.id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                      <span className={cx("min-w-0 flex-1 truncate", r.status === "CONCLUIDA" && "text-slate-400 line-through")}>
                        <span className="font-medium">{r.client.tradeName}</span> · {r.title}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(r.dueAt).slice(-5)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
