import { PageHeader } from "@/components/ui/layout";
import { Pomodoro } from "@/components/pomodoro";
import { isOverdue } from "@/domain/task-rules";
import { requireActor } from "@/server/context";
import { listTasks } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";

export const metadata = { title: "Foco" };

export default async function FocoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const actor = await requireActor();
  const [list, running] = await Promise.all([listTasks(actor, { assigneeId: actor.userId, open: true, pageSize: 40 }), getRunningTimer(actor)]);
  const now = new Date();
  let extra: { id: string; title: string; client: string | null; overdue: boolean }[] = [];
  if (sp.tarefa && !list.rows.some((t) => t.id === sp.tarefa)) {
    const r = await listTasks(actor, { open: true, pageSize: 500 });
    const t = r.rows.find((x) => x.id === sp.tarefa);
    if (t) extra = [{ id: t.id, title: t.title, client: t.client?.tradeName ?? null, overdue: isOverdue({ status: t.status, dueAt: t.dueAt }, now) }];
  }
  const tasks = list.rows
    .map((t) => ({ id: t.id, title: t.title, client: t.client?.tradeName ?? null, overdue: isOverdue({ status: t.status, dueAt: t.dueAt }, now), due: t.dueAt.getTime() }))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.due - b.due)
    .map(({ due: _d, ...t }) => t);
  const all = [...extra, ...tasks];
  return (
    <>
      <PageHeader title="Foco" description="Trabalhe em blocos curtos com pausas. Escolha uma tarefa, aperte começar e deixe o resto para a pausa." />
      <Pomodoro tasks={all} running={running?.taskId ?? null} initialTaskId={sp.tarefa ?? null} />
    </>
  );
}
