import Link from "next/link";
import { Plus } from "lucide-react";
import { copyProcedureToClientAction } from "@/app/actions/procedures";
import { CATEGORY_LABEL, PROCEDURE_STATUS_LABEL, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { fmtDate } from "@/lib/format";
import { ActionForm, SubmitButton } from "./ui/action-form";
import { EmptyState } from "./ui/layout";

export interface ClientProcedureRow {
  id: string;
  title: string;
  category: string;
  status: string;
  version: number;
  updatedAt: Date;
}

/** POPs exclusivos deste cliente (as regras e particularidades do processo dele). */
export function ClientProceduresPanel({
  clientId,
  rows,
  standard,
  canManage,
}: {
  clientId: string;
  rows: ClientProcedureRow[];
  standard: Array<{ id: string; title: string }>;
  canManage: boolean;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-brand-900">POPs deste cliente</h2>
        <p className="mb-4 text-xs text-slate-500">Processos feitos sob medida. Os POPs padrão do escritório ficam em Processos e POPs.</p>
        {rows.length === 0 ? (
          <EmptyState title="Nenhum POP deste cliente" description="Crie um POP do zero ou copie um POP padrão e ajuste para este cliente." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/pops/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {CATEGORY_LABEL[p.category as TaskCategory]} · versão {p.version} · atualizado em {fmtDate(p.updatedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{PROCEDURE_STATUS_LABEL[p.status as ProcedureStatus]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canManage && (
        <aside className="space-y-4">
          <Link href={`/pops/novo?cliente=${clientId}`} className="btn-primary w-full justify-center">
            <Plus aria-hidden className="h-4 w-4" /> Novo POP do cliente
          </Link>
          {standard.length > 0 && (
            <ActionForm action={copyProcedureToClientAction.bind(null, clientId)} className="card space-y-3 p-4">
              <label htmlFor="procedureId" className="label text-xs">
                Copiar um POP padrão
              </label>
              <select id="procedureId" name="procedureId" className="input" required defaultValue="">
                <option value="" disabled>
                  Escolha…
                </option>
                {standard.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn-secondary w-full justify-center" pendingText="Copiando…">
                Copiar e ajustar
              </SubmitButton>
            </ActionForm>
          )}
        </aside>
      )}
    </div>
  );
}
