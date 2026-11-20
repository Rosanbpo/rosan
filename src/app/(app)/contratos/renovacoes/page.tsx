import Link from "next/link";
import { PageHeader } from "@/components/ui/layout";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { renewalsOverview } from "@/server/services/renewals";

export const metadata = { title: "Renovações e reajustes" };

export default async function RenewalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("contracts.manage");
  const sp = await searchParams;
  const raw = Number(String(sp.indice ?? "5").replace(",", "."));
  const index = Number.isFinite(raw) && raw >= 0 && raw <= 50 ? raw : 5;
  const { items } = await renewalsOverview(actor, index);
  const when = (d: number) => (d < 0 ? `venceu há ${-d} dias` : d === 0 ? "hoje" : `em ${d} dias`);
  return (
    <>
      <PageHeader title="Renovações e reajustes" description="Fim de prazo e reajuste anual dos contratos assinados, com o novo valor sugerido." breadcrumb={{ href: "/contratos", label: "Contratos" }} />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm"><span className="font-medium text-slate-700">Índice de reajuste (%)</span><input name="indice" defaultValue={String(index).replace(".", ",")} className="input mt-1 w-28" inputMode="decimal" /></label>
        <button type="submit" className="btn-secondary">Recalcular</button>
        <p className="text-xs text-slate-500">Use o IPCA ou IGP-M acumulado de 12 meses.</p>
      </form>
      {items.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">Nenhum contrato assinado com data de início. Preencha a data de início nos contratos assinados.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Contrato</th><th>Fim do prazo</th><th>Próximo reajuste</th><th>Valor atual</th><th>Com reajuste</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/contratos/${i.id}`} className="font-medium hover:underline">{i.partyName}</Link><p className="text-xs text-slate-500">{i.number}</p></td>
                  <td>{fmtLocalDate(i.termEnd)}<p className={`text-xs ${i.daysToTermEnd >= 0 && i.daysToTermEnd <= 60 ? "font-semibold text-amber-700" : "text-slate-500"}`}>{i.daysToTermEnd < 0 ? "prazo inicial cumprido (renovação automática)" : when(i.daysToTermEnd)}</p></td>
                  <td>{fmtLocalDate(i.nextAnniversary)}<p className={`text-xs ${i.daysToAnniversary <= 60 ? "font-semibold text-amber-700" : "text-slate-500"}`}>{when(i.daysToAnniversary)}</p></td>
                  <td>{fmtMoney(i.fee)}</td>
                  <td className="font-semibold text-emerald-700">{fmtMoney(i.newFee)}<p className="text-xs font-normal text-slate-500">+{fmtMoney(i.newFee - i.fee)}/mês</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
