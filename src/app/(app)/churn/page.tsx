import Link from "next/link";
import { PageHeader, Stat } from "@/components/ui/layout";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { dbDateToLocalDate } from "@/domain/dates";
import { requirePermission } from "@/server/context";
import { churnOverview } from "@/server/services/churn";

export const metadata = { title: "Saídas de clientes" };

export default async function ChurnPage() {
  const actor = await requirePermission("dashboard.view");
  const d = await churnOverview(actor);
  return (
    <>
      <PageHeader title="Saídas de clientes" description="Por que os clientes saem e quanto isso pesa na receita. Para registrar, encerre o cliente na aba Dados dele." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Clientes que saíram" value={d.rows.length} tone={d.rows.length ? "warning" : "default"} />
        <Stat label="Mensalidade perdida" value={fmtMoney(d.lostMrr)} hint="Soma por mês" tone={d.lostMrr ? "danger" : "default"} />
        <Stat label="Tempo médio de casa" value={d.avgMonths === null ? "—" : `${d.avgMonths} meses`} tone="info" />
      </div>
      {d.rows.length === 0 ? <p className="card p-5 text-sm text-slate-600">🎉 Nenhuma saída registrada.</p> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="card lg:col-span-1"><div className="border-b border-hair px-5 py-3"><h2 className="text-[15px] font-semibold text-brand-900">Motivos</h2></div>
            <ul className="divide-y divide-hair text-sm">{d.byReason.map((r) => <li key={r.reason} className="flex justify-between px-5 py-2.5"><span>{r.reason}</span><span className="text-slate-500">{r.count} · {fmtMoney(r.fee)}</span></li>)}</ul></section>
          <section className="card overflow-x-auto lg:col-span-2"><table className="table"><thead><tr><th>Cliente</th><th>Saída</th><th>Motivo</th><th>Mensalidade</th><th>Meses</th></tr></thead>
            <tbody>{d.rows.map((r) => <tr key={r.clientId}><td><Link href={`/clientes/${r.client.id}`} className="font-medium hover:underline">{r.client.tradeName}</Link></td><td>{fmtLocalDate(dbDateToLocalDate(r.leftAt))}</td><td>{r.reason}{r.detail && <p className="text-xs text-slate-500">{r.detail}</p>}</td><td>{fmtMoney(Number(r.monthlyFee ?? 0))}</td><td>{r.monthsActive ?? "—"}</td></tr>)}</tbody></table></section>
        </div>
      )}
    </>
  );
}
