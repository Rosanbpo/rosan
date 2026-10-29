"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { transitionAction } from "@/app/actions/tasks";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES, type Priority, type TaskStatus } from "@/domain/enums";
import { ACTIONS_REQUIRING_NOTE, actionForTarget, type TaskAction } from "@/domain/task-rules";
import { PRIORITY_STYLE, STATUS_DOT, cx } from "@/lib/ui";
import { TransitionDialog } from "./task-actions";

export interface KanbanTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  clientName: string;
  assigneeName: string | null;
  dueLabel: string;
  overdue: boolean;
}

export function KanbanBoard({ tasks, closedNote }: { tasks: KanbanTask[]; closedNote: string }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [dialog, setDialog] = useState<{ task: KanbanTask; action: TaskAction } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (task: KanbanTask, to: TaskStatus) => {
    setMessage(null);
    const action = actionForTarget(task.status, to);
    if (!action) {
      setMessage({ ok: false, text: `Não é possível mover de "${STATUS_LABEL[task.status]}" para "${STATUS_LABEL[to]}".` });
      return;
    }
    if (ACTIONS_REQUIRING_NOTE.includes(action)) {
      setDialog({ task, action });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("action", action);
      const res = await transitionAction(task.id, null, fd);
      setMessage(res?.ok ? { ok: true, text: `"${task.title}" movida para ${STATUS_LABEL[to]}.` } : { ok: false, text: res?.error ?? "Erro." });
      router.refresh();
    });
  };

  return (
    <div>
      <div aria-live="polite" className="min-h-6">
        {pending && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Atualizando…
          </p>
        )}
        {message && !pending && (
          <p role={message.ok ? "status" : "alert"} className={cx("text-sm", message.ok ? "text-emerald-700" : "text-red-700")}>
            {message.text}
          </p>
        )}
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Arraste os cartões entre colunas ou use “Mover para” (acessível por teclado). As mesmas validações dos demais
        fluxos são aplicadas. {closedNote}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-label={`${STATUS_LABEL[status]} (${column.length})`}
              className={cx(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-slate-100/70",
                over === status ? "border-brand-500 bg-brand-50" : "border-slate-200",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const task = tasks.find((t) => t.id === e.dataTransfer.getData("text/plain"));
                if (task && task.status !== status) move(task, status);
              }}
            >
              <h2 className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                <span aria-hidden className={cx("h-2 w-2 rounded-full", STATUS_DOT[status])} />
                {STATUS_LABEL[status]}
                <span className="ml-auto rounded-full bg-white px-1.5 text-slate-500">{column.length}</span>
              </h2>
              <ul className="flex min-h-24 flex-col gap-2 px-2 pb-2">
                {column.map((t) => (
                  <li
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setDragging(t.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cx(
                      "cursor-grab rounded-md border bg-white p-3 shadow-xs",
                      t.overdue ? "border-red-300" : "border-slate-200",
                      dragging === t.id && "opacity-50",
                    )}
                  >
                    <Link href={`/tarefas/${t.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                      {t.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-600">{t.clientName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={cx(t.overdue ? "font-semibold text-red-700" : "text-slate-600")}>
                        {t.overdue && <AlertTriangle aria-label="Atrasada" className="mr-0.5 inline h-3 w-3" />}
                        {t.dueLabel}
                      </span>
                      <span className={PRIORITY_STYLE[t.priority]}>{PRIORITY_LABEL[t.priority]}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t.assigneeName ?? "Sem responsável"}</p>
                    <label className="sr-only" htmlFor={`mv-${t.id}`}>
                      Mover “{t.title}” para
                    </label>
                    <select
                      id={`mv-${t.id}`}
                      className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs"
                      value=""
                      onChange={(e) => e.target.value && move(t, e.target.value as TaskStatus)}
                    >
                      <option value="">Mover para…</option>
                      {TASK_STATUSES.filter((s) => s !== t.status && actionForTarget(t.status, s)).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {dialog && (
        <TransitionDialog
          taskId={dialog.task.id}
          taskTitle={dialog.task.title}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={() => {
            setMessage({ ok: true, text: `"${dialog.task.title}" atualizada.` });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
