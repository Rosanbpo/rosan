"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteTaskAction, rescheduleTaskAction } from "@/app/actions/tasks";
import type { TaskRights } from "@/domain/task-rules";
import { TimerMini } from "./task-timer";

/** Mudar o dia do prazo sem sair da tela. */
export function RescheduleButton({ taskId, dueDate }: { taskId: string; dueDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(rescheduleTaskAction.bind(null, taskId), null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state?.at, state?.ok, router]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Mudar o dia" title="Mudar o dia" className="icon-btn">
        <CalendarDays aria-hidden className="h-4 w-4" />
      </button>
      {open && (
        <form action={action} className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
          <label htmlFor={`due-${taskId}`} className="label text-xs">
            Novo dia do prazo
          </label>
          <input id={`due-${taskId}`} name="dueDate" type="date" required defaultValue={dueDate} className="input mt-1" />
          {state?.error && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {state.error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={pending}>
              {pending && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function DeleteTaskButton({ taskId, title, redirectTo, withLabel }: { taskId: string; title: string; redirectTo?: string; withLabel?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteTaskAction.bind(null, taskId, redirectTo ?? null), null);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.at, state?.ok, router]);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir a tarefa “${title}”? Ela some das listas; o histórico e as horas já apontadas são mantidos.`)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        aria-label="Excluir tarefa"
        title={state?.error ?? "Excluir tarefa"}
        className={withLabel ? "btn-secondary !text-red-700" : "icon-btn hover:!bg-red-50 hover:!text-red-700"}
      >
        {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden className="h-4 w-4" />}
        {withLabel && " Excluir"}
      </button>
      {state?.error && (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      )}
    </form>
  );
}

/** Cronômetro + editar + mudar o dia + excluir, para linhas de lista. */
export function TaskRowTools({
  taskId,
  title,
  dueDate,
  rights,
  runningSince,
}: {
  taskId: string;
  title: string;
  dueDate: string;
  rights: TaskRights;
  runningSince: string | null;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {rights.canTime && <TimerMini taskId={taskId} runningSince={runningSince} />}
      {rights.canEdit && (
        <Link href={`/tarefas/${taskId}/editar`} aria-label="Editar tarefa" title="Editar tarefa" className="icon-btn">
          <Pencil aria-hidden className="h-4 w-4" />
        </Link>
      )}
      {rights.canReschedule && <RescheduleButton taskId={taskId} dueDate={dueDate} />}
      {rights.canDelete && <DeleteTaskButton taskId={taskId} title={title} />}
    </div>
  );
}
