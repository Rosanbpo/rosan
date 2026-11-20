import { recordNpsAction } from "@/app/actions/nps";
import { classifyNps } from "@/domain/nps";
import { Card } from "@/components/ui/layout";

type Row = { id: string; score: number; comment: string | null; answeredAt: Date };
const CLS = { PROMOTOR: ["😍 Promotor", "text-emerald-700"], NEUTRO: ["😐 Neutro", "text-amber-700"], DETRATOR: ["😟 Detrator", "text-red-700"] } as const;

export function NpsCard({ clientId, rows, nps, manage, flash }: { clientId: string; rows: Row[]; nps: number | null; manage: boolean; flash: { ok?: string; erro?: string } }) {
  const last = rows[0];
  return (
    <Card title="⭐ Satisfação (NPS)" description="Registre a nota (0 a 10) que o cliente deu. Acompanhe a evolução ao longo do tempo.">
      {flash.erro && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{flash.erro}</p>}
      {flash.ok && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">Nota registrada.</p>}
      <div className="flex flex-wrap items-center gap-6">
        <div><p className="text-xs text-slate-500">Última nota</p><p className="text-3xl font-bold text-brand-900">{last ? last.score : "—"}</p>{last && <p className={`text-xs font-medium ${CLS[classifyNps(last.score)][1]}`}>{CLS[classifyNps(last.score)][0]}</p>}</div>
        <div><p className="text-xs text-slate-500">NPS do cliente</p><p className="text-3xl font-bold text-brand-900">{nps ?? "—"}</p><p className="text-xs text-slate-500">{rows.length} resposta{rows.length === 1 ? "" : "s"}</p></div>
        {rows.length > 1 && <div className="flex items-end gap-1" aria-label="Evolução das notas">{[...rows].reverse().map((r) => <div key={r.id} title={`${r.score} em ${r.answeredAt.toLocaleDateString("pt-BR")}`} className={`w-3 rounded-t ${r.score >= 9 ? "bg-emerald-500" : r.score >= 7 ? "bg-amber-400" : "bg-red-500"}`} style={{ height: `${4 + r.score * 4}px` }} />)}</div>}
      </div>
      {manage && (
        <form action={recordNpsAction.bind(null, clientId)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-hair pt-4">
          <label className="text-sm"><span className="font-medium text-slate-700">Nota (0 a 10)</span><input name="score" type="number" min={0} max={10} required className="input mt-1 w-24" /></label>
          <label className="min-w-60 flex-1 text-sm"><span className="font-medium text-slate-700">Comentário (opcional)</span><input name="comment" maxLength={1000} className="input mt-1" /></label>
          <button type="submit" className="btn-primary">Registrar nota</button>
        </form>
      )}
      {last?.comment && <p className="mt-3 text-sm text-slate-600">💬 “{last.comment}”</p>}
    </Card>
  );
}
