import { TaskForm } from "@/components/task-form";
import { createTaskAction } from "@/app/actions/tasks";
import { can } from "@/domain/permissions";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { peopleWithClients } from "@/server/services/tasks";
import { projectOptions } from "@/server/services/projects";
import { templatePrefills } from "@/server/services/routine-options";
import { str } from "@/server/page-utils";

export async function NewTaskLoader({ sp, modal = false }: { sp: Record<string, string | string[] | undefined>; modal?: boolean }) {
  const actor = await requireActor();
  const [clients, people, projects, prefills] = await Promise.all([clientOptions(actor), peopleWithClients(actor), projectOptions(actor), templatePrefills(actor)]);
  if (clients.length === 0)
    return <p className="card p-5 text-sm text-slate-600">Você ainda não está vinculado a nenhum cliente ativo. Peça a um administrador para vincular você a um cliente.</p>;
  return (
    <TaskForm
      action={createTaskAction}
      clients={clients}
      people={people}
      projects={projects}
      prefills={prefills}
      mode="create"
      modal={modal}
      canPlan={can(actor, "tasks.plan")}
      selfId={actor.userId}
      cancelHref="/tarefas"
      values={{ clientId: str(sp, "clientId"), projectId: str(sp, "projectId"), dueDate: instantToLocalDate(new Date(), APP_TIMEZONE) }}
    />
  );
}
