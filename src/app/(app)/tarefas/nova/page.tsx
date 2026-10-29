import { PageHeader } from "@/components/ui/layout";
import { TaskForm } from "@/components/task-form";
import { createTaskAction } from "@/app/actions/tasks";
import { can } from "@/domain/permissions";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { peopleWithClients } from "@/server/services/tasks";
import { str } from "@/server/page-utils";

export const metadata = { title: "Nova tarefa" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const [clients, people] = await Promise.all([clientOptions(actor), peopleWithClients(actor)]);
  return (
    <>
      <PageHeader title="Nova tarefa" breadcrumb={{ href: "/tarefas", label: "Tarefas" }} />
      {clients.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">
          Você ainda não está vinculado a nenhum cliente ativo. Peça a um administrador para vincular você a um cliente.
        </p>
      ) : (
        <TaskForm
          action={createTaskAction}
          clients={clients}
          people={people}
          mode="create"
          canPlan={can(actor, "tasks.plan")}
          selfId={actor.userId}
          cancelHref="/tarefas"
          values={{ clientId: str(sp, "clientId"), dueDate: instantToLocalDate(new Date(), APP_TIMEZONE) }}
        />
      )}
    </>
  );
}
