import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { dbDateToLocalDate } from "@/domain/dates";
import { FREQUENCY_LABEL, PENDING_TYPE_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { ClientStatusBadge } from "@/components/ui/badges";
import { TaskTable } from "@/components/task-table";
import { ConfirmAction } from "@/components/confirm-action";
import { archiveClientAction } from "@/app/actions/clients";
import { fmtCnpj, fmtDateTime, fmtLocalDate, fmtPercent, waitingTime } from "@/lib/format";
import { requireActor } from "@/server/context";
import { clientHistory, clientIndicators, getClient } from "@/server/services/clients";
import { listTasks } from "@/server/services/tasks";
import { listPendings } from "@/server/services/pendings";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Cliente" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const client = await orNotFound(getClient(actor, id));
  const [indicators, openTasks, recentDone, pendings, history] = await Promise.all([
    clientIndicators(actor, id),
    listTasks(actor, { clientId: id, open: true, pageSize: 15 }),
    listTasks(actor, { clientId: id, status: ["CONCLUIDA"], sort: "completed", pageSize: 5 }),
    listPendings(actor, { clientId: id }),
    clientHistory(actor, id),
  ]);
  const manage = can(actor, "clients.manage");
  const now = new Date();

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/clientes", label: "Clientes" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.tradeName} <ClientStatusBadge status={client.status} />
            {client.archivedAt && <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">Arquivado</span>}
          </span>
        }
        description={`${client.legalName}${client.cnpj ? ` · CNPJ ${fmtCnpj(client.cnpj)}` : ""}`}
        actions={
          <>
            <Link href={`/tarefas/nova?clientId=${id}`} className="btn-primary">
              <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
            </Link>
            {manage && (
              <Link href={`/clientes/${id}/editar`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
            {manage &&
              (client.archivedAt ? (
                <ConfirmAction action={archiveClientAction.bind(null, id, false)} label="Reativar" confirm="Reativar este cliente?" />
              ) : (
                <ConfirmAction
                  action={archiveClientAction.bind(null, id, true)}
                  label="Arquivar"
                  className="btn-ghost text-red-700"
                  confirm="Arquivar o cliente? O histórico é preservado e as recorrências ativas serão pausadas."
                />
              ))}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Abertas" value={indicators.open} href={`/tarefas?clientId=${id}&abertas=1`} />
        <Stat label="Atrasadas" value={indicators.overdue} tone={indicators.overdue ? "danger" : "default"} href={`/tarefas?clientId=${id}&atrasadas=1`} />
        <Stat label="Aguardando" value={indicators.waiting} hint="Cliente ou terceiro" href={`/pendencias?clientId=${id}`} />
        <Stat label="Em revisão" value={indicators.review} tone="info" href={`/tarefas?clientId=${id}&status=EM_REVISAO`} />
        <Stat label="Concluídas (30 dias)" value={indicators.completed30} />
        <Stat label="No prazo (30 dias)" value={fmtPercent(indicators.onTimeRate)} hint="Concluídas até o prazo ÷ concluídas" tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Tarefas abertas" actions={<Link className="text-sm text-brand-700 hover:underline" href={`/tarefas?clientId=${id}`}>Ver todas</Link>} bodyClassName="p-0">
            {openTasks.rows.length ? (
              <TaskTable rows={openTasks.rows} showClient={false} caption="Tarefas abertas do cliente" />
            ) : (
              <div className="p-4">
                <EmptyState title="Nenhuma tarefa aberta" description="Crie uma tarefa ou vincule uma rotina recorrente a este cliente." />
              </div>
            )}
          </Card>

          <Card title="Pendências em aberto">
            {pendings.rows.length ? (
              <ul className="divide-y divide-slate-100">
                {pendings.rows.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <Link href={`/tarefas/${p.task.id}`} className="font-medium hover:underline">
                      {p.task.title}
                    </Link>
                    <p>{p.reason}</p>
                    <p className="text-xs text-slate-500">
                      Aguardando {PENDING_TYPE_LABEL[p.type].toLowerCase()} há {waitingTime(p.requestedAt, now)} · acompanhar em{" "}
                      {fmtLocalDate(dbDateToLocalDate(p.followUpAt))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma pendência em aberto.</p>
            )}
          </Card>

          <Card title="Concluídas recentemente" bodyClassName="p-0">
            {recentDone.rows.length ? (
              <TaskTable rows={recentDone.rows} showClient={false} compact caption="Tarefas concluídas recentemente" />
            ) : (
              <p className="p-4 text-sm text-slate-500">Nenhuma tarefa concluída ainda.</p>
            )}
          </Card>

          <Card title="Histórico" description="Últimos eventos do cliente e de suas tarefas">
            {history.length ? (
              <ol className="space-y-2">
                {history.map((e) => (
                  <li key={e.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                    <p>
                      {e.taskId ? (
                        <Link className="hover:underline" href={`/tarefas/${e.taskId}`}>
                          {e.summary}
                        </Link>
                      ) : (
                        e.summary
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.actor?.name ?? "Sistema"} · {fmtDateTime(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Sem eventos.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cadastro">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Contato</dt>
              <dd>{client.contactName ?? "—"}</dd>
              <dt className="text-slate-500">E-mail</dt>
              <dd className="break-all">{client.contactEmail ?? "—"}</dd>
              <dt className="text-slate-500">Telefone</dt>
              <dd>{client.contactPhone ?? "—"}</dd>
              <dt className="text-slate-500">Canais</dt>
              <dd>{client.contactChannels ?? "—"}</dd>
              <dt className="text-slate-500">Início</dt>
              <dd>{client.startDate ? fmtLocalDate(dbDateToLocalDate(client.startDate)) : "—"}</dd>
              <dt className="text-slate-500">Responsável</dt>
              <dd>{client.responsibleOperator?.name ?? "—"}</dd>
              <dt className="text-slate-500">Gestor</dt>
              <dd>{client.manager?.name ?? "—"}</dd>
              <dt className="text-slate-500">Equipe</dt>
              <dd>{client.members.map((m) => m.user.name).join(", ") || "—"}</dd>
            </dl>
            <h3 className="mt-4 text-xs font-semibold text-slate-500 uppercase">Serviços contratados</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {client.services.length ? (
                client.services.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
            {client.notes && (
              <>
                <h3 className="mt-4 text-xs font-semibold text-slate-500 uppercase">Observações operacionais</h3>
                <p className="mt-1 text-sm whitespace-pre-wrap">{client.notes}</p>
              </>
            )}
          </Card>

          <Card
            title="Rotinas vinculadas"
            actions={
              can(actor, "recurrences.manage") && (
                <Link className="text-sm text-brand-700 hover:underline" href={`/rotinas/recorrencias/nova?clientId=${id}`}>
                  Vincular
                </Link>
              )
            }
          >
            {client.recurrences.length ? (
              <ul className="space-y-2 text-sm">
                {client.recurrences.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <div>
                      {can(actor, "recurrences.manage") ? (
                        <Link className="font-medium hover:underline" href={`/rotinas/recorrencias/${r.id}`}>
                          {r.template.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.template.name}</span>
                      )}
                      <p className="text-xs text-slate-500">
                        {FREQUENCY_LABEL[r.frequency]} · {r.assignee?.name ?? "responsável do cliente"}
                      </p>
                    </div>
                    <span className={`text-xs ${r.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"}`}>
                      {r.status === "ACTIVE" ? "Ativa" : "Pausada"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma rotina vinculada.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
