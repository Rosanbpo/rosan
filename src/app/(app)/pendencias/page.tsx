import Link from "next/link";
import { dbDateToLocalDate, instantToLocalDate } from "@/domain/dates";
import { PENDING_TYPE_LABEL, type TaskStatus } from "@/domain/enums";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/badges";
import { Select } from "@/components/filter-select";
import { fmtDateTime, fmtLocalDate, waitingTime } from "@/lib/format";
import { cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { listPendings } from "@/server/services/pendings";
import { oneOf, pageOf, str } from "@/server/page-utils";

export const metadata = { title: "Pendências" };

type SP = Record<string, string | string[] | undefined>;

export default async function PendingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const filters = {
    clientId: str(sp, "clientId"),
    type: oneOf(str(sp, "type"), ["CLIENTE", "TERCEIRO"] as const),
    mine: str(sp, "minhas") === "1",
    page: pageOf(sp),
  };
  const [result, clients] = await Promise.all([listPendings(actor, filters), clientOptions(actor)]);
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);

  return (
    <>
      <PageHeader
        title="Pendências externas"
        description="Tarefas aguardando cliente ou terceiros. Nenhuma mensagem é enviada automaticamente: use esta lista para cobrar no canal combinado com o cliente."
      />
      <form className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-5" aria-label="Filtros de pendências">
        <Select name="clientId" label="Cliente" value={filters.clientId} options={clients.map((c) => ({ value: c.id, label: c.tradeName }))} />
        <Select
          name="type"
          label="Aguardando"
          value={filters.type}
          options={[
            { value: "CLIENTE", label: "Cliente" },
            { value: "TERCEIRO", label: "Terceiro" },
          ]}
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="minhas" value="1" defaultChecked={filters.mine} /> Só das minhas tarefas
        </label>
        <div className="col-span-2 flex items-end gap-2">
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
          <Link href="/pendencias" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {result.total === 0 ? (
        <EmptyState
          title="Nenhuma pendência em aberto"
          description="Quando uma tarefa for marcada como “aguardando cliente” ou “aguardando terceiro”, ela aparecerá aqui com o próximo acompanhamento."
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Pendências externas em aberto</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Tarefa</th>
                  <th scope="col">Informação / documento necessário</th>
                  <th scope="col">Quem responde</th>
                  <th scope="col">Solicitado em</th>
                  <th scope="col">Próximo acompanhamento</th>
                  <th scope="col">Em espera</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((p) => {
                  const followUp = dbDateToLocalDate(p.followUpAt);
                  const due = followUp <= today;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/clientes/${p.client.id}`} className="font-medium hover:underline">
                          {p.client.tradeName}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/tarefas/${p.task.id}`} className="hover:underline">
                          {p.task.title}
                        </Link>
                        <div className="mt-1">
                          <StatusBadge status={p.task.status as TaskStatus} />
                        </div>
                        <p className="text-xs text-slate-500">Resp.: {p.task.assignee?.name ?? "—"}</p>
                      </td>
                      <td className="max-w-xs">{p.reason}</td>
                      <td>
                        {PENDING_TYPE_LABEL[p.type]}
                        {p.respondent && <span className="block text-xs text-slate-500">{p.respondent}</span>}
                      </td>
                      <td className="whitespace-nowrap">
                        {fmtDateTime(p.requestedAt)}
                        <span className="block text-xs text-slate-500">por {p.createdBy.name}</span>
                      </td>
                      <td className={cx("whitespace-nowrap", due && "font-semibold text-red-700")}>
                        {fmtLocalDate(followUp)}
                        {due && <span className="block text-xs">Acompanhar hoje</span>}
                      </td>
                      <td className="whitespace-nowrap">{waitingTime(p.requestedAt, now)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-3">
            <Pagination total={result.total} page={result.page} pageSize={result.pageSize} searchParams={sp} basePath="/pendencias" />
          </div>
        </div>
      )}
    </>
  );
}
