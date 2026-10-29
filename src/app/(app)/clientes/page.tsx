import Link from "next/link";
import { Plus } from "lucide-react";
import { CLIENT_STATUSES, CLIENT_STATUS_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { ClientStatusBadge } from "@/components/ui/badges";
import { Select } from "@/components/filter-select";
import { fmtCnpj } from "@/lib/format";
import { requireActor } from "@/server/context";
import { listClients } from "@/server/services/clients";
import { oneOf, pageOf, str } from "@/server/page-utils";

export const metadata = { title: "Clientes" };

type SP = Record<string, string | string[] | undefined>;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const archived = str(sp, "arquivados") === "1";
  const result = await listClients(actor, {
    q: str(sp, "q"),
    status: oneOf(str(sp, "status"), CLIENT_STATUSES),
    archived,
    page: pageOf(sp),
  });
  const manage = can(actor, "clients.manage");
  return (
    <>
      <PageHeader
        title="Clientes"
        description={manage ? "Todos os clientes da empresa." : "Clientes aos quais você está vinculado."}
        actions={
          manage && (
            <Link href="/clientes/novo" className="btn-primary">
              <Plus aria-hidden className="h-4 w-4" /> Novo cliente
            </Link>
          )
        }
      />
      <form className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-5" aria-label="Filtros de clientes">
        <div className="col-span-2">
          <label htmlFor="f-q" className="label text-xs">
            Pesquisa
          </label>
          <input id="f-q" name="q" className="input" defaultValue={str(sp, "q")} placeholder="Nome, razão social ou CNPJ" />
        </div>
        <Select name="status" label="Status" value={str(sp, "status")} options={CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABEL[s] }))} />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="arquivados" value="1" defaultChecked={archived} /> Ver arquivados
        </label>
        <div className="flex items-end gap-2">
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
          <Link href="/clientes" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {result.total === 0 ? (
        <EmptyState
          title={archived ? "Nenhum cliente arquivado" : "Nenhum cliente encontrado"}
          description={manage ? "Cadastre o primeiro cliente para começar a organizar a operação." : "Peça a um administrador para vincular você aos clientes que atende."}
          action={manage && <Link href="/clientes/novo" className="btn-primary">Cadastrar cliente</Link>}
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Lista de clientes</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Gestor</th>
                  <th scope="col" className="text-right">Abertas</th>
                  <th scope="col" className="text-right">Atrasadas</th>
                  <th scope="col" className="text-right">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {c.tradeName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {c.legalName}
                        {c.cnpj && ` · ${fmtCnpj(c.cnpj)}`}
                      </p>
                    </td>
                    <td>
                      <ClientStatusBadge status={c.status} />
                    </td>
                    <td>{c.responsibleOperator?.name ?? "—"}</td>
                    <td>{c.manager?.name ?? "—"}</td>
                    <td className="text-right tabular-nums">{c._count.tasks}</td>
                    <td className={`text-right tabular-nums ${c.overdueCount ? "font-semibold text-red-700" : ""}`}>{c.overdueCount}</td>
                    <td className="text-right tabular-nums">{c._count.pendings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-3">
            <Pagination total={result.total} page={result.page} pageSize={result.pageSize} searchParams={sp} basePath="/clientes" />
          </div>
        </div>
      )}
    </>
  );
}
