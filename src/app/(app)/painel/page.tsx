import Link from "next/link";
import { isValidLocalDate } from "@/domain/dates";
import { PRIORITIES, TASK_CATEGORIES } from "@/domain/enums";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { TaskTable } from "@/components/task-table";
import { Select, categoryOptions, priorityOptions } from "@/components/filter-select";
import { fmtLocalDate, fmtMinutes, fmtPercent } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { managerDashboard } from "@/server/services/dashboard";
import { clientOptions } from "@/server/services/clients";
import { assignableUsers } from "@/server/services/tasks";
import { oneOf, str } from "@/server/page-utils";

export const metadata = { title: "Painel do gestor" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const from = str(sp, "from");
  const to = str(sp, "to");
  const filters = {
    from: from && isValidLocalDate(from) ? from : undefined,
    to: to && isValidLocalDate(to) ? to : undefined,
    clientId: str(sp, "clientId"),
    assigneeId: str(sp, "assigneeId"),
    category: oneOf(str(sp, "category"), TASK_CATEGORIES),
    priority: oneOf(str(sp, "priority"), PRIORITIES),
  };
  const [data, clients, users] = await Promise.all([
    managerDashboard(actor, filters),
    clientOptions(actor),
    assignableUsers(actor),
  ]);
  const qs = new URLSearchParams(
    Object.entries({ clientId: filters.clientId, assigneeId: filters.assigneeId, category: filters.category, priority: filters.priority }).filter(
      (e): e is [string, string] => !!e[1],
    ),
  ).toString();
  const taskLink = (extra: string) => `/tarefas?${[extra, qs].filter(Boolean).join("&")}`;
  const maxLoad = Math.max(1, ...data.workload.map((w) => w.open));

  return (
    <>
      <PageHeader
        title="Painel do gestor"
        description={
          <>
            Situação em {fmtLocalDate(data.today)} · Indicadores de entrega do período{" "}
            <strong>
              {fmtLocalDate(data.period.from)} a {fmtLocalDate(data.period.to)}
            </strong>
          </>
        }
      />

      <form className="card mb-6 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7" aria-label="Filtros do painel">
        <div>
          <label htmlFor="f-from" className="label text-xs">
            Período: de
          </label>
          <input id="f-from" type="date" name="from" defaultValue={data.period.from} className="input" />
        </div>
        <div>
          <label htmlFor="f-to" className="label text-xs">
            até
          </label>
          <input id="f-to" type="date" name="to" defaultValue={data.period.to} className="input" />
        </div>
        <Select name="clientId" label="Cliente" value={filters.clientId} options={clients.map((c) => ({ value: c.id, label: c.tradeName }))} />
        <Select name="assigneeId" label="Responsável" value={filters.assigneeId} options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <Select name="category" label="Categoria" value={filters.category} options={categoryOptions} placeholder="Todas" />
        <Select name="priority" label="Prioridade" value={filters.priority} options={priorityOptions} placeholder="Todas" />
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" type="submit">
            Filtrar
          </button>
          <Link href="/painel" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Vencem hoje" value={data.dueToday.count} href={taskLink("prazo=hoje")} tone="warning" />
        <Stat label="Atrasadas" value={data.overdue.count} href={taskLink("atrasadas=1")} tone="danger" hint="Prazo vencido e não concluída" />
        <Stat
          label="Aguardando cliente"
          value={data.waitingClient.count}
          href="/pendencias?type=CLIENTE"
          hint={`+ ${data.waitingThirdCount} aguardando terceiros`}
        />
        <Stat label="Em revisão" value={data.review.count} href={taskLink("status=EM_REVISAO")} tone="info" />
        <Stat label="Próximos 7 dias" value={data.next7.count} href={taskLink("prazo=7dias")} hint="Entregas previstas" />
        <Stat
          label="Entregas no prazo"
          value={fmtPercent(data.onTime.rate)}
          tone={data.onTime.rate === null ? "default" : data.onTime.rate >= 0.9 ? "success" : data.onTime.rate >= 0.7 ? "warning" : "danger"}
          hint={`${data.onTime.onTime} de ${data.onTime.completed} concluídas no período`}
        />
      </div>

      <p className="mb-6 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <strong>Fórmula — entregas no prazo:</strong> tarefas concluídas entre {fmtLocalDate(data.period.from)} e{" "}
        {fmtLocalDate(data.period.to)} cuja data de conclusão é menor ou igual ao prazo ÷ total de tarefas concluídas no
        mesmo período. <strong>Atrasadas:</strong> tarefas não concluídas nem canceladas com prazo anterior a agora
        (independe do período). Contadores de hoje, revisão, pendências e próximos 7 dias refletem a situação atual.
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Tarefas atrasadas" description="Mais antigas primeiro" actions={<Link className="text-sm text-brand-700 hover:underline" href={taskLink("atrasadas=1")}>Ver todas</Link>} bodyClassName="p-0">
          {data.overdue.rows.length ? <TaskTable rows={data.overdue.rows} compact caption="Tarefas atrasadas" /> : <div className="p-4"><EmptyState title="Nenhuma tarefa atrasada" description="Ótimo! Todas as tarefas abertas estão dentro do prazo." /></div>}
        </Card>
        <Card title="Vencem hoje" actions={<Link className="text-sm text-brand-700 hover:underline" href={taskLink("prazo=hoje")}>Ver todas</Link>} bodyClassName="p-0">
          {data.dueToday.rows.length ? <TaskTable rows={data.dueToday.rows} compact caption="Tarefas com vencimento hoje" /> : <div className="p-4"><EmptyState title="Nada vence hoje" /></div>}
        </Card>
        <Card title="Em revisão" description="Aguardando aprovação do revisor" bodyClassName="p-0">
          {data.review.rows.length ? <TaskTable rows={data.review.rows} compact caption="Tarefas em revisão" /> : <div className="p-4"><EmptyState title="Nenhuma tarefa em revisão" /></div>}
        </Card>
        <Card title="Aguardando cliente" actions={<Link className="text-sm text-brand-700 hover:underline" href="/pendencias">Pendências</Link>} bodyClassName="p-0">
          {data.waitingClient.rows.length ? <TaskTable rows={data.waitingClient.rows} compact caption="Tarefas aguardando cliente" /> : <div className="p-4"><EmptyState title="Nenhuma tarefa aguardando cliente" /></div>}
        </Card>

        <Card title="Carga por operador" description="Tarefas abertas, atrasadas e horas estimadas (filtros aplicados)">
          {data.workload.length ? (
            <ul className="space-y-3">
              {data.workload.map((w) => (
                <li key={w.assigneeId ?? "none"}>
                  <div className="flex items-center justify-between text-sm">
                    <Link className="font-medium hover:underline" href={taskLink(`assigneeId=${w.assigneeId ?? "none"}&abertas=1`)}>
                      {w.name}
                    </Link>
                    <span className="text-xs text-slate-600 tabular-nums">
                      {w.open} abertas · <span className={w.overdue ? "font-semibold text-red-700" : ""}>{w.overdue} atrasadas</span> · {fmtMinutes(w.estimatedMinutes)}
                    </span>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="bg-red-500" style={{ width: `${(w.overdue / maxLoad) * 100}%` }} />
                    <div className="bg-brand-500" style={{ width: `${((w.open - w.overdue) / maxLoad) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem tarefas abertas" />
          )}
        </Card>

        <Card title="Clientes com mais atrasos" description="Top 5 por quantidade de tarefas atrasadas">
          {data.topOverdueClients.length ? (
            <ol className="divide-y divide-slate-100">
              {data.topOverdueClients.map((c, i) => (
                <li key={c.clientId} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="mr-2 text-slate-400 tabular-nums">{i + 1}.</span>
                    <Link href={`/clientes/${c.clientId}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </span>
                  <span className="font-semibold text-red-700 tabular-nums">{c.overdue}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Nenhum cliente com atrasos" />
          )}
        </Card>

        <Card title="Entregas previstas nos próximos 7 dias" className="xl:col-span-2" bodyClassName="p-0">
          {data.next7.rows.length ? <TaskTable rows={data.next7.rows} caption="Próximas entregas" /> : <div className="p-4"><EmptyState title="Nenhuma entrega prevista" /></div>}
        </Card>
      </div>
    </>
  );
}
