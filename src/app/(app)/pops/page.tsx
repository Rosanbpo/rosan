import Link from "next/link";
import { POP_COLUMN, POP_COVER, POP_EMOJI } from "@/domain/pop-style";
import { Plus } from "lucide-react";
import { CATEGORY_LABEL, PROCEDURE_STATUSES, PROCEDURE_STATUS_LABEL, TASK_CATEGORIES, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { dbDateToLocalDate } from "@/domain/dates";
import { Select, categoryOptions } from "@/components/filter-select";
import { EmptyState } from "@/components/ui/layout";
import { fmtLocalDate } from "@/lib/format";
import { cx } from "@/lib/ui";
import { importPopLibraryAction } from "@/app/actions/procedures";
import { ConfirmAction } from "@/components/confirm-action";
import { POP_LIBRARY } from "@/domain/pop-library";
import { requireActor } from "@/server/context";
import { requireSection } from "@/server/services/library";
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
  await requireSection(actor, "pops");
  const sp = await searchParams;
  const manage = can(actor, "procedures.manage");
  const category = oneOf(str(sp, "area"), TASK_CATEGORIES);
  const status = manage ? oneOf(str(sp, "situacao"), PROCEDURE_STATUSES) : undefined;
  const rows = await listProcedures(actor, { q: str(sp, "q"), category, status });

  const vista = oneOf(str(sp, "vista"), ["lista", "categoria", "galeria", "tabela"] as const) ?? "categoria";
  const q = str(sp, "q");
  const vlink = (v: string) => `/pops?vista=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&area=${category}` : ""}`;
  const grouped = new Map<TaskCategory, typeof rows>();
  for (const r of rows) grouped.set(r.category as TaskCategory, [...(grouped.get(r.category as TaskCategory) ?? []), r]);

  const cats = (vista === "categoria" && !category && !q ? TASK_CATEGORIES.filter((c) => grouped.has(c) || manage) : [...grouped.keys()]) as TaskCategory[];
  const TABS = [
    ["lista", "☰ Lista"],
    ["categoria", "▥ Por categoria"],
    ["galeria", "▦ Galeria"],
    ["tabela", "▤ Tabela"],
  ] as const;
  const meta = (p: (typeof rows)[number]) => `v${p.version}${p.owner ? ` · ${p.owner.name}` : ""}${p.reviewedAt ? ` · revisado em ${fmtLocalDate(dbDateToLocalDate(p.reviewedAt))}` : ""}`;

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="mb-6">
        <div className="text-5xl" aria-hidden>📚</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Processos</h1>
        <p className="mt-1 text-slate-500">Procedimentos operacionais padrão: como cada rotina deve ser executada.</p>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <nav className="flex flex-wrap gap-1" aria-label="Forma de ver">
          {TABS.map(([v, label]) => (
            <Link key={v} href={vlink(v)} aria-current={vista === v ? "page" : undefined} className={cx("rounded-md px-3 py-1.5 text-sm font-medium", vista === v ? "bg-slate-200/70 text-slate-900" : "text-slate-500 hover:bg-slate-100")}>
              {label}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex flex-wrap items-center gap-2" aria-label="Filtros de POPs">
          <input type="hidden" name="vista" value={vista} />
          <input name="q" className="input w-56" defaultValue={q} placeholder="Buscar processo…" aria-label="Buscar processo" />
          <div className="w-44"><Select name="area" label="" value={category} options={categoryOptions} /></div>
          {manage && (
            <div className="w-36"><Select name="situacao" label="" value={status} placeholder="Sem arquivados" options={PROCEDURE_STATUSES.map((s) => ({ value: s, label: PROCEDURE_STATUS_LABEL[s] }))} /></div>
          )}
          <button className="btn-secondary" type="submit">Filtrar</button>
          {manage && (
            <>
              <ConfirmAction action={importPopLibraryAction} label="Importar meus processos" confirm={`Importar os ${POP_LIBRARY.length} processos prontos que ainda não existem?`} />
              <Link href="/pops/novo" className="btn-primary"><Plus aria-hidden className="h-4 w-4" /> Novo processo</Link>
            </>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum processo encontrado"
          description={manage ? "Documente o passo a passo das rotinas para padronizar a operação." : "Ainda não há POPs publicados."}
          action={manage && <Link href="/pops/novo" className="btn-primary">Criar primeiro processo</Link>}
        />
      ) : vista === "categoria" ? (
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {cats.map((cat) => {
            const t = POP_COLUMN[cat];
            const items = grouped.get(cat) ?? [];
            return (
              <section key={cat} aria-label={CATEGORY_LABEL[cat]} className={cx("w-72 shrink-0 rounded-xl p-2.5", t.col)}>
                <h2 className="mb-2 flex items-center gap-2 px-1.5 pt-1 text-sm">
                  <span className={cx("rounded-md px-2 py-0.5 font-medium", t.chip)}>{CATEGORY_LABEL[cat]}</span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link href={`/pops/${p.id}`} className={cx("flex items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:shadow-md", t.card)}>
                        <span aria-hidden className="mt-px">{POP_EMOJI[cat]}</span>
                        <span>{p.title}{manage && p.status !== "PUBLICADO" && <span className="ml-1.5 text-[11px] font-normal text-slate-400">· {PROCEDURE_STATUS_LABEL[p.status as ProcedureStatus]}</span>}</span>
                      </Link>
                    </li>
                  ))}
                  {manage && (
                    <li>
                      <Link href={`/pops/novo?area=${cat}`} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/70 hover:text-slate-600"><Plus aria-hidden className="h-3.5 w-3.5" /> Nova página</Link>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : vista === "lista" ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/pops/${p.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span aria-hidden className="text-lg">{POP_EMOJI[p.category as TaskCategory]}</span>
                <span className="min-w-0 flex-1 font-medium text-slate-900">{p.title}</span>
                <span className={cx("rounded-md px-2 py-0.5 text-xs font-medium", POP_COLUMN[p.category as TaskCategory].chip)}>{CATEGORY_LABEL[p.category as TaskCategory]}</span>
                <span className="text-xs text-slate-400">{meta(p)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : vista === "tabela" ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Nome</th><th>Categoria</th>{manage && <th>Situação</th>}<th>Responsável</th><th>Última revisão</th><th>Versão</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/pops/${p.id}`} className="font-medium hover:underline">{POP_EMOJI[p.category as TaskCategory]} {p.title}</Link></td>
                  <td><span className={cx("rounded-md px-2 py-0.5 text-xs font-medium", POP_COLUMN[p.category as TaskCategory].chip)}>{CATEGORY_LABEL[p.category as TaskCategory]}</span></td>
                  {manage && <td>{PROCEDURE_STATUS_LABEL[p.status as ProcedureStatus]}</td>}
                  <td>{p.owner?.name ?? "—"}</td>
                  <td>{p.reviewedAt ? fmtLocalDate(dbDateToLocalDate(p.reviewedAt)) : "—"}</td>
                  <td>{p.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/pops/${p.id}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className={`h-16 bg-gradient-to-r ${POP_COVER[p.category as TaskCategory]}`} aria-hidden />
                <div className="px-4 pb-4">
                  <div className="-mt-5 text-3xl leading-none" aria-hidden>{POP_EMOJI[p.category as TaskCategory]}</div>
                  <p className="mt-2 font-semibold leading-snug text-slate-900 group-hover:text-brand-700">{p.title}</p>
                  <span className={cx("mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium", POP_COLUMN[p.category as TaskCategory].chip)}>{CATEGORY_LABEL[p.category as TaskCategory]}</span>
                  <p className="mt-1.5 text-xs text-slate-400">{meta(p)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
