import { headers } from "next/headers";
import { createDiagnosisLinkAction, revokeDiagnosisLinkAction, saveDiagnosisAction, saveVolumeAction } from "@/app/actions/diagnosis";
import { Card } from "@/components/ui/layout";
import { DiagnosisFields, type DiagData } from "@/components/diagnosis-fields";
import { monthLabel } from "@/components/closing-panel";
import { currentCompetence } from "@/server/services/closings";
import { fmtMoney } from "@/lib/format";
import type { VolumeCheck } from "@/domain/consultive-pricing";

type Diag = (NonNullable<DiagData> & { token?: string | null; source?: string; submittedAt?: Date | null; pricedFee?: unknown; pricedHours?: unknown; pricedAt?: Date | null }) | null;
type Row = { id: string; competence: string; statementLines: number; entries: number; notes: string | null; check: VolumeCheck };

const LEVEL = {
  ok: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "✅ Dentro do previsto" },
  atencao: { cls: "bg-amber-50 text-amber-800 ring-amber-200", label: "⚠️ Acima do previsto" },
  reajustar: { cls: "bg-red-50 text-red-700 ring-red-200", label: "🔴 Reavaliar mensalidade" },
} as const;

export async function DiagnosisPanel({ clientId, diagnosis, rows, manage, flash }: { clientId: string; diagnosis: Diag; rows: Row[]; manage: boolean; flash: { dx?: string; erro?: string } }) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const link = diagnosis?.token ? `${proto}://${host}/diagnostico/${diagnosis.token}` : null;
  const priced = diagnosis?.pricedFee ? Number(diagnosis.pricedFee) : null;
  const month = currentCompetence();
  const list = (v?: string | null) => (v ? v.split(/\n|,/).map((x) => x.trim()).filter(Boolean) : []);
  const chips = (title: string, emoji: string, v?: string | null) => (
    <div><p className="text-xs font-medium text-slate-500">{emoji} {title}</p>
      {list(v).length ? <p className="mt-1 flex flex-wrap gap-1">{list(v).map((x) => <span key={x} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-700 ring-1 ring-brand-200 ring-inset">{x}</span>)}</p> : <p className="mt-1 text-xs text-slate-400">—</p>}
    </div>
  );
  return (
    <div className="mt-6 space-y-5">
      {flash.erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{flash.erro}</p>}
      {flash.dx && !flash.erro && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{flash.dx === "link" ? "Link gerado. Copie e envie ao cliente." : flash.dx === "volume" ? "Movimentação salva." : "Diagnóstico salvo."}</p>}

      <Card title="🧭 Diagnóstico do cliente" description="Base da precificação. Preenchido por nós ou pelo próprio cliente, pelo link.">
        {diagnosis ? (
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            {chips("Bancos", "🏦", diagnosis.banks)}
            {chips("Plataformas e sistemas", "🧩", diagnosis.platforms)}
            {chips("Cartões e maquininhas", "💳", diagnosis.cards)}
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-600">Ainda não há diagnóstico. Envie o link para o cliente preencher ou lance manualmente abaixo.</p>
        )}
        {diagnosis && (
          <p className="mb-4 text-xs text-slate-500">
            {diagnosis.source === "CLIENTE" && diagnosis.submittedAt ? `📨 Respondido pelo cliente em ${diagnosis.submittedAt.toLocaleDateString("pt-BR")}` : "✍️ Lançado manualmente"}
            {priced ? ` · Precificado em ${fmtMoney(priced)}/mês${diagnosis.pricedHours ? ` (${Number(diagnosis.pricedHours).toLocaleString("pt-BR")} h)` : ""}` : ""}
          </p>
        )}
        {manage && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <form action={createDiagnosisLinkAction.bind(null, clientId)}><button type="submit" className="btn-secondary btn-sm">🔗 {link ? "Gerar novo link" : "Gerar link para o cliente"}</button></form>
              {link && <form action={revokeDiagnosisLinkAction.bind(null, clientId)}><button type="submit" className="btn-secondary btn-sm">Desativar link</button></form>}
            </div>
            {link && <input readOnly value={link} className="input text-xs" aria-label="Link do diagnóstico" />}
            <details className="rounded-xl border border-hair p-4" open={!diagnosis}>
              <summary className="cursor-pointer text-sm font-medium text-brand-900">✍️ Lançar ou editar manualmente</summary>
              <form action={saveDiagnosisAction.bind(null, clientId)} className="mt-4 space-y-4">
                <DiagnosisFields d={diagnosis} />
                <button type="submit" className="btn-primary">Salvar diagnóstico</button>
              </form>
            </details>
          </div>
        )}
      </Card>

      {diagnosis && (
        <Card title="📈 Movimentação mensal" description="Compare com o que foi usado na precificação. Se a movimentação crescer, reavalie a mensalidade.">
          <p className="mb-3 text-sm text-slate-600">Base da precificação: <strong>{diagnosis.statementLines?.toLocaleString("pt-BR")}</strong> linhas de extrato e <strong>{diagnosis.entries?.toLocaleString("pt-BR")}</strong> lançamentos por mês{priced ? <> · mensalidade <strong>{fmtMoney(priced)}</strong></> : null}.</p>
          {rows.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Mês</th><th>Extrato</th><th>Lançamentos</th><th>Variação</th><th>Situação</th></tr></thead>
              <tbody className="divide-y divide-hair">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{monthLabel(r.competence)}</td>
                    <td>{r.statementLines.toLocaleString("pt-BR")}</td>
                    <td>{r.entries.toLocaleString("pt-BR")}</td>
                    <td>{r.check.growth >= 0 ? "+" : ""}{Math.round(r.check.growth * 100)}%</td>
                    <td><span className={`rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ${LEVEL[r.check.level].cls}`}>{LEVEL[r.check.level].label}</span>{r.check.suggestedFee ? <span className="ml-2 text-xs text-slate-500">sugestão {fmtMoney(r.check.suggestedFee)}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-500">Nenhum mês registrado ainda.</p>}
          {manage && (
            <form action={saveVolumeAction.bind(null, clientId)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-hair pt-4">
              <label className="text-sm"><span className="font-medium text-slate-700">Mês</span><input type="month" name="month" defaultValue={month} required className="input mt-1" /></label>
              <label className="text-sm"><span className="font-medium text-slate-700">Linhas de extrato</span><input type="number" min={0} name="statementLines" required className="input mt-1" /></label>
              <label className="text-sm"><span className="font-medium text-slate-700">Lançamentos</span><input type="number" min={0} name="entries" required className="input mt-1" /></label>
              <button type="submit" className="btn-primary">Registrar mês</button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
