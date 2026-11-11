import Link from "next/link";
import { CLIENT_STATUS_LABEL } from "@/domain/enums";
import { marginTone } from "@/domain/profitability";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { ClientStatusBadge } from "@/components/ui/badges";
import { fmtHours, fmtMoney, fmtPercent } from "@/lib/format";
import { cx } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { oneOf, str } from "@/server/page-utils";
import { currentMonth, getPortfolio, isMonth, shiftMonth } from "@/server/services/portfolio";

export const metadata = { title: "Carteira e rentabilidade" };

type SP = Record<string, string | string[] | undefined>;

const TONE = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700 font-semibold",
  neutral: "text-slate-500",
} as const;

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const label = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("finance.view");
  const sp = await searchParams;
  const requested = str(sp, "mes");
  const month = isMonth(requested) ? requested : currentMonth();
  const sort = oneOf(str(sp, "ordem"), ["nome", "margem", "horas", "mensalidade"] as const) ?? "nome";
  const data = await getPortfolio(actor, month);
  const t = data.totals;

  const rows = [...data.rows].sort((a, b) => {
    if (sort === "margem") return (a.marginPct ?? 9) - (b.marginPct ?? 9);
    if (sort === "horas") return b.minutes - a.minutes;
    if (sort === "mensalidade") return (b.monthlyFee ?? 0) - (a.monthlyFee ?? 0);
    return a.tradeName.localeCompare(b.tradeName, "pt-BR");
  });
  const link = (extra: Record<string, string>) => `/carteira?${new URLSearchParams({ mes: month, ordem: sort, ...extra }).toString()}`;

  return (
    <>
      <PageHeader
        title="Carteira e rentabilidade"
        description="Mensalidade contratada contra o tempo apontado em cada cliente."
        actions={
          <nav aria-label="Mês" className="flex items-center gap-2">
            <Link className="btn-secondary" href={link({ mes: shiftMonth(month, -1) })}>
              ←
            </Link>
            <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
            <Link className="btn-secondary" href={link({ mes: shiftMonth(month, 1) })}>
              →
            </Link>
          </nav>
        }
      />

      {data.hourCost === null && (
        <p role="note" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Informe o <strong>custo médio da hora</strong> em{" "}
          <Link href="/configuracoes" className="underline">
            Configurações
          </Link>{" "}
          para calcular custo e margem por cliente.
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita recorrente (MRR)" value={fmtMoney(t.mrr)} hint={`${t.activeClients} cliente(s) ativo(s)`} tone="success" />
        <Stat label="Ticket médio" value={fmtMoney(t.averageTicket)} hint={t.withoutFee ? `${t.withoutFee} ativo(s) sem mensalidade` : undefined} />
        <Stat label="Horas apontadas" value={fmtHours(t.minutes)} hint={t.cost === null ? undefined : `Custo ${fmtMoney(t.cost)}`} />
        <Stat
          label="Margem do mês"
          value={fmtMoney(t.margin)}
          hint="MRR − custo das horas"
          tone={t.margin === null ? "default" : t.margin < 0 ? "danger" : "success"}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum cliente na carteira" description="Cadastre clientes e informe a mensalidade de cada um." />
      ) : (
        <Card title="Clientes" bodyClassName="p-0" actions={
          <div className="flex gap-2 text-xs">
            {(["nome", "mensalidade", "horas", "margem"] as const).map((o) => (
              <Link key={o} href={link({ ordem: o })} className={cx("rounded px-2 py-1", sort === o ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100")}>
                {o === "nome" ? "Nome" : o === "mensalidade" ? "Mensalidade" : o === "horas" ? "Horas" : "Pior margem"}
              </Link>
            ))}
          </div>
        }>
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Rentabilidade por cliente</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Mensalidade</th>
                  <th scope="col" className="text-right">Horas</th>
                  <th scope="col" className="text-right">Custo</th>
                  <th scope="col" className="text-right">Margem</th>
                  <th scope="col" className="text-right">%</th>
                  <th scope="col" className="text-right">Abertas</th>
                  <th scope="col" className="text-right">Atrasadas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/clientes/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {r.tradeName}
                      </Link>
                      <p className="text-xs text-slate-500">{r.operator ?? "Sem operador"}{r.billingDay ? ` · vence dia ${r.billingDay}` : ""}</p>
                    </td>
                    <td>
                      <ClientStatusBadge status={r.status} />
                      <span className="sr-only">{CLIENT_STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="text-right tabular-nums">{fmtMoney(r.monthlyFee)}</td>
                    <td className="text-right tabular-nums">{r.minutes ? fmtHours(r.minutes) : "—"}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.cost)}</td>
                    <td className={cx("text-right tabular-nums", TONE[marginTone(r.marginPct)])}>{fmtMoney(r.margin)}</td>
                    <td className={cx("text-right tabular-nums", TONE[marginTone(r.marginPct)])}>{fmtPercent(r.marginPct)}</td>
                    <td className="text-right tabular-nums">{r.openTasks}</td>
                    <td className={cx("text-right tabular-nums", r.overdueTasks ? "font-semibold text-red-700" : "")}>{r.overdueTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Margem = mensalidade − (horas apontadas no mês × custo da hora). Verde acima de 35%, amarelo entre 15% e 35%, vermelho abaixo de 15%. O MRR soma apenas clientes ativos.
          </p>
        </Card>
      )}
    </>
  );
}
