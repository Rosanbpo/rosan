"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { addReminderAction, deleteReminderAction, reminderToTaskAction, toggleReminderAction } from "@/app/actions/reminders";
import { cx } from "@/lib/ui";

export interface ReminderView {
  id: string;
  text: string;
  done: boolean;
  taskId: string | null;
  createdLabel: string;
}

function ToTask({ id, today }: { id: string; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reminderToTaskAction.bind(null, id), null);
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
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-ghost btn-sm text-brand-700" title="Criar uma tarefa a partir deste lembrete">
        <CalendarPlus aria-hidden className="h-3.5 w-3.5" /> Virar tarefa
      </button>
      {open && (
        <form action={action} className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
          <label htmlFor={`rem-due-${id}`} className="label text-xs">
            Para quando?
          </label>
          <input id={`rem-due-${id}`} name="dueDate" type="date" required defaultValue={today} className="input mt-1" />
          {state?.error && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {state.error}
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <button type="submit" className="btn-primary btn-sm" disabled={pending}>
              {pending && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />} Criar tarefa
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ r, today }: { r: ReminderView; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="flex items-start gap-2.5 py-2">
      <input
        type="checkbox"
        aria-label={`Marcar “${r.text}” como feito`}
        className="mt-1 h-4 w-4"
        checked={r.done}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await toggleReminderAction(r.id, e.target.checked);
            router.refresh();
          })
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm break-words whitespace-pre-wrap", r.done ? "text-slate-400 line-through" : "text-slate-800")}>{r.text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
          <span>{r.createdLabel}</span>
          {r.taskId && (
            <Link href={`/tarefas/${r.taskId}`} className="text-brand-700 hover:underline">
              virou tarefa →
            </Link>
          )}
        </div>
      </div>
      {!r.done && !r.taskId && <ToTask id={r.id} today={today} />}
      <button
        type="button"
        aria-label="Excluir lembrete"
        title="Excluir lembrete"
        disabled={pending}
        className="btn-ghost btn-sm text-slate-300 hover:text-red-600"
        onClick={() =>
          start(async () => {
            if (!window.confirm("Excluir este lembrete?")) return;
            await deleteReminderAction(r.id);
            router.refresh();
          })
        }
      >
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export function ClientReminders({ clientId, reminders, today }: { clientId: string; reminders: ReminderView[]; today: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addReminderAction.bind(null, clientId), null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.at, state?.ok, router]);
  const open = reminders.filter((r) => !r.done);
  const closed = reminders.filter((r) => r.done);
  return (
    <section className="card p-4" aria-label="Lembretes do cliente">
      <h3 className="text-[15px] font-semibold text-brand-900">📌 Lembretes</h3>
      <p className="mt-0.5 text-xs text-slate-500">Anote o que pedir ao cliente ou fazer depois. Marque como feito ou transforme em tarefa.</p>
      <form ref={formRef} action={action} className="mt-3 flex gap-2">
        <label htmlFor={`rem-${clientId}`} className="sr-only">
          Novo lembrete
        </label>
        <input id={`rem-${clientId}`} name="text" required maxLength={500} className="input" placeholder="Ex.: pedir extrato do Itaú" autoComplete="off" />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : "Salvar"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
      {open.length === 0 && closed.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Nenhum lembrete por aqui ainda.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-slate-100">
            {open.map((r) => (
              <Row key={r.id} r={r} today={today} />
            ))}
          </ul>
          {closed.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 select-none">Feitos ({closed.length})</summary>
              <ul className="mt-1 divide-y divide-slate-100">
                {closed.map((r) => (
                  <Row key={r.id} r={r} today={today} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
