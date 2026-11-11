import Link from "next/link";
import { Plus } from "lucide-react";
import { CATEGORY_LABEL, PROCEDURE_STATUSES, PROCEDURE_STATUS_LABEL, TASK_CATEGORIES, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { dbDateToLocalDate } from "@/domain/dates";
import { Select, categoryOptions } from "@/components/filter-select";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtLocalDate } from "@/lib/format";
import { cx } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { oneOf, str } from "@/server/page-utils";
import { listProcedures } from "@/server/services/procedures";

export const metadata = { title: "Processos e POPs" };

type SP = Record<string, string | string[] | undefined>;

const STATUS_STYLE: Record<ProcedureStatus, string> = {
  RASCUNHO: "bg-amber-50 text-amber-800 ring-amber-200",
  PUBLICADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ARQUIVADO: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export default async function ProceduresPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const manage = can(actor, "procedures.manage");
  const category = oneOf(str(sp, "area"), TASK_CATEGORIES);
  const status = manage ? oneOf(str(sp, "situacao"), PROCEDURE_STATUSES) : undefined;
  const rows = await listProcedures(actor, { q: str(sp, "q"), category, status });

  const grouped = new Map<TaskCategory, typeof rows>();
  for (const r of rows) grouped.set(r.category as TaskCategory, [...(grouped.get(r.category as TaskCategory) ?? []), r]);

  return (
    <>
      <PageHeader
        title="Processos e POPs"
        description="Procedimentos operacionais padrão: como cada rotina deve ser executada."
        actions={
          manage && (
            <Link href="/pops/novo" className="btn-primary">
              <Plus aria-hidden className="h-4 w-4" /> Novo POP
            </Link>
          )
        }
      />
      <form className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-5" aria-label="Filtros de POPs">
        <div className="col-span-2">
          <label htmlFor="f-q" className="label text-xs">
            Pesquisa
          </label>
          <input id="f-q" name="q" className="input" defaultValue={str(sp, "q")} placeholder="Título, objetivo ou conteúdo" />
        </div>
        <Select name="area" label="Área" value={category} options={categoryOptions} />
        {manage && (
          <Select
            name="situacao"
            label="Situação"
            value={status}
            placeholder="Sem arquivados"
            options={PROCEDURE_STATUSES.map((s) => ({ value: s, label: PROCEDURE_STATUS_LABEL[s] }))}
          />
        )}
        <div className="flex items-end gap-2">
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
          <Link href="/pops" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum POP encontrado"
          description={manage ? "Documente o passo a passo das rotinas para padronizar a operação." : "Ainda não há POPs publicados."}
          action={manage && <Link href="/pops/novo" className="btn-primary">Criar primeiro POP</Link>}
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([cat, items]) => (
            <section key={cat} aria-label={CATEGORY_LABEL[cat]}>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">{CATEGORY_LABEL[cat]}</h2>
              <ul className="card divide-y divide-slate-100">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/pops/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Versão {p.version}
                        {p.owner && ` · ${p.owner.name}`}
                        {p.reviewedAt && ` · revisado em ${fmtLocalDate(dbDateToLocalDate(p.reviewedAt))}`}
                      </p>
                    </div>
                    {manage && (
                      <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_STYLE[p.status as ProcedureStatus])}>
                        {PROCEDURE_STATUS_LABEL[p.status as ProcedureStatus]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
