"use client";

import { Trash2 } from "lucide-react";
import { deleteTimeAction, logTimeAction } from "@/app/actions/time";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

/** Formulário de apontamento de horas em uma tarefa. */
export function LogTimeForm({ taskId, today }: { taskId: string; today: string }) {
  return (
    <ActionForm action={logTimeAction} resetOnSuccess className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[8rem_9rem_1fr_auto] sm:items-start">
      <input type="hidden" name="taskId" value={taskId} />
      <Field label="Tempo" name="minutes" hint="1:30, 90 (min) ou 1,5 (h)">
        <input id="minutes" name="minutes" required className="input" placeholder="1:30" autoComplete="off" />
      </Field>
      <Field label="Dia" name="workedOn">
        <input id="workedOn" name="workedOn" type="date" required max={today} defaultValue={today} className="input" />
      </Field>
      <Field label="Observação" name="note">
        <input id="note" name="note" className="input" placeholder="O que foi feito (opcional)" maxLength={500} />
      </Field>
      <div className="sm:pt-6">
        <SubmitButton pendingText="Salvando…">Apontar</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteTimeButton({ id }: { id: string }) {
  return (
    <ActionForm action={deleteTimeAction.bind(null, id)} confirm="Remover este apontamento?" inlineFeedback>
      <SubmitButton className="btn-ghost btn-sm text-slate-500" pendingText="…">
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
        <span className="sr-only">Remover apontamento</span>
      </SubmitButton>
    </ActionForm>
  );
}
