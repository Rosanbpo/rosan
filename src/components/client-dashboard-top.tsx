import Link from "next/link";
import { closingProgress } from "@/domain/closing";
import { fmtMoney } from "@/lib/format";

type Closing = { closedAt: Date | null; items: { doneAt: Date | null }[] } | null;

/** Faixa de resumo do cliente: como ele está, de relance. */
export function ClientDashboardTop({
  clientId, closing, ours, clientSide, thirdSide, missingDocs, fee, billing, overdue,
}: {
  clientId: string; closing: { closing: Closing } | null; ours: number; clientSide: number; thirdSide: number;
  missingDocs: number; fee: number | null; billing: string | null; overdue: number;
}) {
  const prog = closing?.closing ? closingProgress(closing.closing.items) : null;
  const alerts: string[] = [];
  if (overdue) alerts.push(`⚠️ ${overdue} tarefa${overdue > 1 ? "s" : ""} atrasada${overdue > 1 ? "s" : ""}`);
  if (clientSide) alerts.push(`⏳ ${clientSide} pendência${clientSide > 1 ? "s" : ""} esperando o cliente`);
  if (missingDocs) alerts.push(`📄 ${missingDocs} documento${missingDocs > 1 ? "s" : ""} do mês sem receber`);
  const tile = "rounded-xl border border-hair bg-white p-4 transition hover:border-brand-200";
  return (
    <div className="mb-6 space-y-3">
      <div className={`rounded-xl border p-4 text-sm ${alerts.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
        {alerts.length ? <p className="flex flex-wrap gap-x-5 gap-y-1 font-medium">{alerts.map((a) => <span key={a}>{a}</span>)}</p> : <p className="font-medium">✅ Tudo em dia com este cliente.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={`/clientes/${clientId}?aba=fechamentos`} className={tile}>
          <p className="text-xs font-medium text-slate-500">📅 Fechamento do mês</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{prog ? `${prog.pct}%` : "—"}</p>
          <p className="text-xs text-slate-500">{prog ? `${prog.done} de ${prog.total} itens` : "não iniciado"}</p>
        </Link>
        <Link href={`/clientes/${clientId}?aba=pendencias`} className={tile}>
          <p className="text-xs font-medium text-slate-500">🧩 Dependem de nós</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{ours}</p>
          <p className="text-xs text-slate-500">{clientSide} do cliente · {thirdSide} de terceiros</p>
        </Link>
        <Link href={`/clientes/${clientId}?aba=pendencias`} className={tile}>
          <p className="text-xs font-medium text-slate-500">📄 Documentos faltando</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{missingDocs}</p>
          <p className="text-xs text-slate-500">competência anterior</p>
        </Link>
        <Link href={`/clientes/${clientId}?aba=financeiro`} className={tile}>
          <p className="text-xs font-medium text-slate-500">💰 Mensalidade</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{fee !== null ? fmtMoney(fee) : "—"}</p>
          <p className="text-xs text-slate-500">{billing ? `vence ${billing}` : "sem vencimento"}</p>
        </Link>
      </div>
    </div>
  );
}
