import Link from "next/link";
import { Plus } from "lucide-react";
import { dbDateToLocalDate } from "@/domain/dates";
import { PENDING_TYPE_LABEL } from "@/domain/enums";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { MyTaskList } from "@/components/my-task-list";
import { fmtLocalDate, waitingTime } from "@/lib/format";
import { cx } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { myOperation } from "@/server/services/dashboard";

export const metadata = { title: "Minha operação" };

export default async function MyOperationPage() {
  const actor = await requireActor();
  const data = await myOperation(actor);
  const now = new Date();
  return (
    <>
      <PageHeader
        title={`Olá, ${actor.name.split(" ")[0]}`}
        description={`Sua operação em ${fmtLocalDate(data.today)}. Comece pelas atrasadas e pelas que vencem hoje.`}
        actions={
          <Link href="/tarefas/nova" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Atrasadas" value={data.overdue.length} tone={data.overdue.length ? "danger" : "default"} />
        <Stat label="Vencem hoje" value={data.todayTasks.length} tone="warning" />
        <Stat label="Devolvidas" value={data.returned.length} tone={data.returned.length ? "warning" : "default"} />
        <Stat label="Para eu revisar" value={data.toReview.length} tone="info" />
        <Stat label="Pendências" value={data.pendings.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Minhas tarefas atrasadas" className={cx(data.overdue.length > 0 && "border-red-200")}>
          <MyTaskList rows={data.overdue} actor={actor} empty="Nenhuma tarefa atrasada." />
        </Card>
        <Card title="Minhas tarefas de hoje">
          <MyTaskList rows={data.todayTasks} actor={actor} empty="Nada mais vence hoje." />
        </Card>
        {data.returned.length > 0 && (
          <Card title="Itens devolvidos pelo revisor" description="Corrija e reenvie para revisão">
            <MyTaskList rows={data.returned} actor={actor} empty="" />
          </Card>
        )}
        {data.toReview.length > 0 && (
          <Card title="Aguardando minha revisão">
            <MyTaskList rows={data.toReview} actor={actor} empty="" />
          </Card>
        )}
        <Card title="Pendências que preciso acompanhar" description="Ordenadas pelo próximo acompanhamento">
          {data.pendings.length ? (
            <ul className="divide-y divide-slate-100">
              {data.pendings.map((p) => {
                const followUp = dbDateToLocalDate(p.followUpAt);
                const late = followUp <= data.today;
                return (
                  <li key={p.id} className="py-3 text-sm">
                    <Link href={`/tarefas/${p.task.id}`} className="font-medium hover:underline">
                      {p.task.title}
                    </Link>
                    <p className="text-slate-600">
                      {p.client.tradeName} · aguardando {PENDING_TYPE_LABEL[p.type].toLowerCase()} há {waitingTime(p.requestedAt, now)}
                    </p>
                    <p className="text-slate-700">{p.reason}</p>
                    <p className={cx("text-xs", late ? "font-semibold text-red-700" : "text-slate-500")}>
                      Acompanhar em {fmtLocalDate(followUp)}
                      {late && " — cobrar hoje"}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Nenhuma pendência em aberto" />
          )}
        </Card>
        <Card title="Próximas tarefas" description="Próximos 15 dias">
          <MyTaskList rows={data.upcoming} actor={actor} empty="Nenhuma tarefa prevista." />
        </Card>
      </div>
    </>
  );
}
