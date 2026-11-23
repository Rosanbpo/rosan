import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ClientReminders } from "@/components/client-reminders";
import { DayTaskCard, StartRoutineButton, type DayTask } from "@/components/day-tasks";
import { addDays, instantToLocalDate, localDateTimeToInstant } from "@/domain/dates";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, type Priority, type TaskCategory, type TaskStatus } from "@/domain/enums";
import { isOverdue, taskRights } from "@/domain/task-rules";
import { fmtDateTime } from "@/lib/format";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { listReminders } from "@/server/services/client-reminders";
import { checklistsOf, dayOverview, listTasks } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";

/** Aba "Hoje" do painel do cliente: tarefas do dia, lembretes e rotina na mesma tela. */
export async function ClientDayPanel({ clientId }: { clientId: string }) {
  const actor = await requireActor();
  const now = new Date();
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const dayStart = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const dayEnd = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const [result, reminders, running, overview] = await Promise.all([
    listTasks(actor, { clientId, open: true, dueTo: dayEnd, sort: "due", pageSize: 100 }),
    listReminders(actor, clientId),
    getRunningTimer(actor),
    dayOverview(actor, dayStart, dayEnd),
  ]);
  const checklists = await checklistsOf(result.rows.map((t) => t.id));
  const tasks: DayTask[] = result.rows.map((t) => {
    const status = t.status as TaskStatus;
    return {
      id: t.id,
      title: t.title,
      category: CATEGORY_LABEL[t.category as TaskCategory] ?? "",
      dueLabel: fmtDateTime(t.dueAt).slice(0, 16),
      overdue: isOverdue({ status, dueAt: t.dueAt }, now),
      waiting: status === "AGUARDANDO_CLIENTE" || status === "AGUARDANDO_TERCEIRO",
      statusLabel: STATUS_LABEL[status],
      priorityLabel: PRIORITY_LABEL[t.priority as Priority] ?? "",
      isRoutine: t.origin === "RECORRENTE",
      canTime: taskRights(actor, { status, assigneeId: t.assigneeId, reviewerId: t.reviewerId, createdById: t.createdById, origin: t.origin }).canTime,
      runningSince: running?.taskId === t.id ? running.startedAt : null,
      checklist: (checklists.get(t.id) ?? []).map((c) => ({ id: c.id, label: c.label, required: c.required, done: c.done })),
    };
  });
  const late = tasks.filter((t) => t.overdue);
  const todays = tasks.filter((t) => !t.overdue);
  const runningHere = tasks.find((t) => t.runningSince);
  const firstToDo = tasks.find((t) => t.canTime && !t.waiting && !t.runningSince) ?? null;
  const withWork = overview.filter((o) => o.clientId);
  const idx = withWork.findIndex((o) => o.clientId === clientId);
  const next = withWork.length > 0 ? withWork[(idx + 1) % withWork.length] : null;
  const nextOther = next && next.clientId !== clientId ? next : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/hoje" className="btn-ghost btn-sm text-slate-600">
          <ArrowLeft aria-hidden className="h-4 w-4" /> Voltar para Hoje
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {runningHere ? (
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900">Rotina em andamento: {runningHere.title}</span>
          ) : (
            <StartRoutineButton taskId={firstToDo?.id ?? null} label={tasks.length > 0 ? "Iniciar rotina do cliente" : "Sem tarefas para iniciar"} />
          )}
          {nextOther && (
            <Link href={`/clientes/${nextOther.clientId}?aba=hoje`} className="btn-secondary">
              Próximo: {nextOther.name} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="card flex items-center gap-3 p-6 text-sm text-slate-600">
              <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-600" /> Tudo em dia com este cliente por hoje.
            </div>
          ) : (
            <>
              {late.length > 0 && (
                <section aria-label="Atrasadas">
                  <h3 className="mb-2 text-sm font-semibold text-red-700">Atrasadas ({late.length})</h3>
                  <ul className="space-y-2">
                    {late.map((t) => (
                      <DayTaskCard key={t.id} t={t} />
                    ))}
                  </ul>
                </section>
              )}
              {todays.length > 0 && (
                <section aria-label="Vencem hoje">
                  <h3 className="mb-2 text-sm font-semibold text-brand-900">Hoje ({todays.length})</h3>
                  <ul className="space-y-2">
                    {todays.map((t) => (
                      <DayTaskCard key={t.id} t={t} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
          <p className="text-xs text-slate-400">
            <Link href={`/tarefas?view=lista&clientId=${clientId}`} className="text-brand-700 hover:underline">
              Ver todas as tarefas deste cliente
            </Link>
          </p>
        </div>
        <ClientReminders
          clientId={clientId}
          today={today}
          reminders={reminders.map((r) => ({ id: r.id, text: r.text, done: r.done, taskId: r.taskId, createdLabel: fmtDateTime(r.createdAt).slice(0, 10) }))}
        />
      </div>
    </div>
  );
}
