import Link from "next/link";
import { Download } from "lucide-react";
import { EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { PrintButton } from "@/components/print-button";
import { fmtDateTime } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { currentMonth, isMonth, shiftMonth } from "@/server/services/portfolio";
import { monthlyReport } from "@/server/services/reports";
import { str } from "@/server/page-utils";

export const metadata = { title: "Relatórios" };

type SP = Record<string, string | string[] | undefined>;

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const label = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Bars({ rows, color }: { rows: Array<{ name: string; count: number }>; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="text-sm text-slate-500">Sem entregas no mês.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="mb-0.5 flex justify-between">
            <span className="truncate text-slate-700">{r.name}</span>
            <span className="font-semibold tabular-nums text-slate-900">{r.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const requested = str(sp, "mes");
  const month = isMonth(requested) ? requested : currentMonth();
  const r = await monthlyReport(actor, month);
  const maxDay = Math.max(1, ...r.perDay);
  const href = (m: string) => `/relatorios?mes=${m}`;

  return (
    <div className="report-print">
      <PageHeader
        title="Relatórios"
        description={`Entregas e pendências de ${monthLabel(month)}.`}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Link className="btn-secondary" href={href(shiftMonth(month, -1))} aria-label="Mês anterior">
              ←
            </Link>
            <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
            <Link className="btn-secondary" href={href(shiftMonth(month, 1))} aria-label="Próximo mês">
              →
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download de arquivo */}
            <a className="btn-secondary" href={`/relatorios/exportar?mes=${month}`}>
              <Download aria-hidden className="h-4 w-4" /> Exportar para Excel
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tarefas criadas" value={r.created} />
        <Stat label="Concluídas" value={r.completed} tone="success" />
        <Stat label="No prazo" value={r.onTimePct === null ? "—" : `${r.onTimePct}%`} tone={r.onTimePct !== null && r.onTimePct < 80 ? "warning" : "success"} hint={`${r.onTime} de ${r.completed} concluídas`} />
        <Stat label="Pendentes atrasadas" value={r.overdueNow} tone={r.overdueNow ? "danger" : "default"} hint="Abertas com prazo vencido" />
      </div>

      <section className="card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-brand-900">Concluídas por dia</h2>
        {r.completed === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma tarefa concluída neste mês.</p>
        ) : (
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Gráfico de tarefas concluídas por dia do mês">
            {r.perDay.map((n, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-slate-500">{n || ""}</span>
                <div className="w-full rounded-t bg-gradient-to-t from-violet-600 to-sky-400" style={{ height: `${(n / maxDay) * 100}%`, minHeight: n ? 4 : 0 }} />
                <span className="text-[10px] text-slate-400">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Por responsável</h2>
          <Bars rows={r.perPerson} color="bg-emerald-500" />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Por cliente (top 10)</h2>
          <Bars rows={r.perClient} color="bg-sky-500" />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Pendentes por situação</h2>
          <Bars rows={r.byStatus.map((s) => ({ name: s.label, count: s.count }))} color="bg-amber-500" />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-brand-900">Pendentes até o fim do mês</h2>
        {r.backlog.length === 0 ? (
          <EmptyState title="Nada pendente" description="Nenhuma tarefa aberta com prazo até o fim do mês." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tarefa</th>
                  <th>Responsável</th>
                  <th>Situação</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {r.backlog.map((b) => (
                  <tr key={b.id}>
                    <td>{b.client}</td>
                    <td>
                      <Link href={`/tarefas/${b.id}`} className="hover:underline">
                        {b.title}
                      </Link>
                    </td>
                    <td>{b.assignee ?? "—"}</td>
                    <td>{b.status}</td>
                    <td>{fmtDateTime(b.dueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
