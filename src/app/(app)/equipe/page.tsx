import Link from "next/link";
import { Stat, PageHeader } from "@/components/ui/layout";
import { ROLE_LABEL } from "@/domain/enums";
import { currentMonth, isMonth } from "@/server/services/portfolio";
import { requirePermission } from "@/server/context";
import { str } from "@/server/page-utils";
import { teamOverview } from "@/server/services/team";
import { cx } from "@/lib/ui";

export const metadata = { title: "Equipe" };

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const q = str(sp, "mes");
  const month = isMonth(q) ? q : currentMonth();
  const { rows, capacityHours } = await teamOverview(actor, month);
  const totalHours = rows.reduce((a, r) => a + r.hours, 0);
  const totalOpen = rows.reduce((a, r) => a + r.open, 0);
  const totalOverdue = rows.reduce((a, r) => a + r.overdue, 0);
  const occupancy = capacityHours ? Math.round((totalHours / capacityHours) * 100) : null;
  return (
    <>
      <PageHeader title="Equipe" description="Carga, atrasos, entregas e horas de cada pessoa." />
      <div className="mb-5 flex items-center gap-2 text-sm">
        <Link href={`/equipe?mes=${shift(month, -1)}`} className="btn-secondary btn-sm">
          ‹ Anterior
        </Link>
        <span className="min-w-24 text-center font-medium text-slate-800">{month.split("-").reverse().join("/")}</span>
        <Link href={`/equipe?mes=${shift(month, 1)}`} className="btn-secondary btn-sm">
          Próximo ›
        </Link>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pessoas ativas" value={String(rows.length)} tone="default" />
        <Stat label="Tarefas abertas" value={String(totalOpen)} tone="info" />
        <Stat label="Em atraso" value={String(totalOverdue)} tone={totalOverdue ? "danger" : "success"} />
        <Stat label="Horas no mês" value={`${totalHours.toFixed(1)} h`} hint={occupancy !== null ? `${occupancy}% da capacidade (${capacityHours} h)` : "Defina a capacidade em Configurações"} tone="warning" />
      </div>
      <div className="card overflow-x-auto">
        <table className="table w-full text-sm">
          <caption className="sr-only">Equipe</caption>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Papel</th>
              <th className="text-right">Clientes</th>
              <th className="text-right">Abertas</th>
              <th className="text-right">Atrasadas</th>
              <th className="text-right">Concluídas no mês</th>
              <th className="text-right">No prazo</th>
              <th className="text-right">Horas</th>
              <th>2 etapas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td>{ROLE_LABEL[r.role]}</td>
                <td className="text-right">{r.clients}</td>
                <td className="text-right">{r.open}</td>
                <td className={cx("text-right", r.overdue > 0 && "font-semibold text-red-600")}>{r.overdue}</td>
                <td className="text-right">{r.completed}</td>
                <td className="text-right">{r.onTimePct === null ? "—" : `${r.onTimePct}%`}</td>
                <td className="text-right">{r.hours.toFixed(1)}</td>
                <td>{r.twoFactor ? <span className="text-emerald-700">Ativa</span> : <span className="text-slate-400">Não</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
