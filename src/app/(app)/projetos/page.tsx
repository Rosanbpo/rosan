import Link from "next/link";
import { Plus } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Select } from "@/components/filter-select";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtLocalDate } from "@/lib/format";
import { requireActor } from "@/server/context";
import { oneOf, str } from "@/server/page-utils";
import { listProjects } from "@/server/services/projects";

export const metadata = { title: "Projetos" };

type SP = Record<string, string | string[] | undefined>;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const manage = can(actor, "projects.manage");
  const status = oneOf(str(sp, "situacao"), PROJECT_STATUSES);
  const rows = await listProjects(actor, { q: str(sp, "q"), status });

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Implantações, migrações e iniciativas com início, fim e tarefas vinculadas."
        actions={
          manage && (
            <Link href="/projetos/novo" className="btn-primary">
              <Plus aria-hidden className="h-4 w-4" /> Novo projeto
            </Link>
          )
        }
      />
      <form className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4" aria-label="Filtros de projetos">
        <div className="col-span-2">
          <label htmlFor="f-q" className="label text-xs">
            Pesquisa
          </label>
          <input id="f-q" name="q" className="input" defaultValue={str(sp, "q")} placeholder="Nome do projeto" />
        </div>
        <Select name="situacao" label="Situação" value={status} placeholder="Em aberto" options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))} />
        <div className="flex items-end gap-2">
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
          <Link href="/projetos" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum projeto encontrado"
          description="Crie um projeto para agrupar as tarefas de uma implantação ou iniciativa."
          action={manage && <Link href="/projetos/novo" className="btn-primary">Criar projeto</Link>}
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Lista de projetos</caption>
              <thead>
                <tr>
                  <th scope="col">Projeto</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Prazo</th>
                  <th scope="col">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/projetos/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td>{p.client ? p.client.tradeName : <span className="text-slate-400">Interno</span>}</td>
                      <td>{PROJECT_STATUS_LABEL[p.status]}</td>
                      <td>{p.ownerName ?? "—"}</td>
                      <td className="whitespace-nowrap">{p.dueDate ? fmtLocalDate(p.dueDate) : "—"}</td>
                      <td className="min-w-36">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct}% concluído`}>
                            <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500">
                            {p.done}/{p.total}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
