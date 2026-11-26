import { PageHeader } from "@/components/ui/layout";
import { Pomodoro } from "@/components/pomodoro";
import { isOverdue } from "@/domain/task-rules";
import { requireActor } from "@/server/context";
import { listTasks } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";

export const metadata = { title: "Foco" };

export default async function FocoPage() {
  const actor = await requireActor();
  const [list, running] = await Promise.all([listTasks(actor, { assigneeId: actor.userId, open: true, pageSize: 40 }), getRunningTimer(actor)]);
  const now = new Date();
  const tasks = list.rows
    .map((t) => ({ id: t.id, title: t.title, client: t.client?.tradeName ?? null, overdue: isOverdue({ status: t.status, dueAt: t.dueAt }, now), due: t.dueAt.getTime() }))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.due - b.due)
    .map(({ due: _d, ...t }) => t);
  return (
    <>
      <PageHeader title="Foco" description="Trabalhe em blocos curtos com pausas. Escolha uma tarefa, aperte começar e deixe o resto para a pausa." />
      <Pomodoro tasks={tasks} running={running?.taskId ?? null} />
    </>
  );
}
