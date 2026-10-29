import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { TaskForm } from "@/components/task-form";
import { updateTaskAction } from "@/app/actions/tasks";
import { instantToLocalDate, instantToLocalTime } from "@/domain/dates";
import { can } from "@/domain/permissions";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { getTaskDetail, peopleWithClients } from "@/server/services/tasks";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Editar tarefa" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const task = await orNotFound(getTaskDetail(actor, id));
  const manager = can(actor, "tasks.plan");
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") redirect(`/tarefas/${id}`);
  if (!manager && task.assigneeId !== actor.userId && task.reviewerId !== actor.userId) redirect(`/tarefas/${id}`);
  const people = await peopleWithClients(actor);
  return (
    <>
      <PageHeader title="Editar tarefa" breadcrumb={{ href: `/tarefas/${id}`, label: task.title }} />
      <TaskForm
        action={updateTaskAction.bind(null, id)}
        clients={[{ id: task.client.id, tradeName: task.client.tradeName }]}
        people={people}
        mode="edit"
        canPlan={manager}
        selfId={actor.userId}
        cancelHref={`/tarefas/${id}`}
        values={{
          clientId: task.clientId,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          assigneeId: task.assigneeId,
          reviewerId: task.reviewerId,
          competence: task.competence,
          dueDate: instantToLocalDate(task.dueAt, APP_TIMEZONE),
          dueTime: instantToLocalTime(task.dueAt, APP_TIMEZONE),
          startDate: task.startAt ? instantToLocalDate(task.startAt, APP_TIMEZONE) : undefined,
          startTime: task.startAt ? instantToLocalTime(task.startAt, APP_TIMEZONE) : undefined,
          estimatedMinutes: task.estimatedMinutes,
          requiresEvidence: task.requiresEvidence,
        }}
      />
    </>
  );
}
