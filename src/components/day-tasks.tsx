"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronRight, ListChecks, Loader2, Play } from "lucide-react";
import { finishTaskAction, startTimerAction } from "@/app/actions/timer";
import type { ActionState } from "@/lib/action-state";
import { cx } from "@/lib/ui";
import { ChecklistItemRow } from "./task-work";
import { TimerMini } from "./task-timer";

export interface DayTask {
  id: string;
  title: string;
  category: string;
  dueLabel: string;
  overdue: boolean;
  waiting: boolean;
  statusLabel: string;
  priorityLabel: string;
  isRoutine: boolean;
  canTime: boolean;
  runningSince: string | null;
  checklist: Array<{ id: string; label: string; required: boolean; done: boolean }>;
}

function useRun(action: () => Promise<ActionState>) {
  const router = useRouter();
  const [state, run, pending] = useActionState(async (_: ActionState) => action(), null as ActionState);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.at, state?.ok, router]);
  return { state, run, pending };
}

/** Botão que começa a rotina: inicia o cronômetro da primeira tarefa do dia que ainda dá para fazer. */
export function StartRoutineButton({ taskId, label }: { taskId: string | null; label: string }) {
  const start = useRun(() => startTimerAction(taskId ?? "", null));
  return (
    <form action={start.run} className="flex items-center gap-2">
      <button type="submit" disabled={!taskId || start.pending} className="btn-primary">
        {start.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />} {label}
      </button>
      {start.state?.error && (
        <span role="alert" className="text-xs text-red-700">
          {start.state.error}
        </span>
      )}
    </form>
  );
}

function FinishButton({ taskId }: { taskId: string }) {
  const fin = useRun(() => finishTaskAction(taskId, null));
  return (
    <form action={fin.run} className="flex flex-col items-end">
      <button type="submit" disabled={fin.pending} className="btn-secondary btn-sm !text-emerald-700">
        {fin.pending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />} Concluir
      </button>
      {fin.state?.error && (
        <span role="alert" className="mt-1 max-w-56 text-right text-xs text-red-700">
          {fin.state.error}
        </span>
      )}
    </form>
  );
}

export function DayTaskCard({ t }: { t: DayTask }) {
  const [open, setOpen] = useState(t.runningSince !== null);
  const done = t.checklist.filter((c) => c.done).length;
  const running = t.runningSince !== null;
  return (
    <li className={cx("rounded-lg border bg-white", running ? "border-brand-700 ring-1 ring-brand-700/30" : t.overdue ? "border-red-200" : "border-slate-200")}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        {t.canTime ? <TimerMini taskId={t.id} runningSince={t.runningSince} /> : <span className="h-8 w-8" />}
        <div className="min-w-0 flex-1">
          <Link href={`/tarefas/${t.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
            {t.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className={cx(t.overdue && "font-semibold text-red-700")}>{t.overdue ? `Atrasada · ${t.dueLabel}` : t.dueLabel}</span>
            <span>{t.statusLabel}</span>
            {t.waiting && <span className="font-medium text-amber-700">aguardando retorno</span>}
            {t.isRoutine && <span>rotina</span>}
          </p>
        </div>
        {t.checklist.length > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-ghost btn-sm text-slate-600">
            <ListChecks aria-hidden className="h-3.5 w-3.5" /> {done}/{t.checklist.length}
            {open ? <ChevronDown aria-hidden className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
          </button>
        )}
        {!t.waiting && <FinishButton taskId={t.id} />}
      </div>
      {open && t.checklist.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 px-4">
          {t.checklist.map((c) => (
            <ChecklistItemRow key={c.id} id={c.id} label={c.label} required={c.required} done={c.done} editable removable={false} />
          ))}
        </ul>
      )}
    </li>
  );
}
