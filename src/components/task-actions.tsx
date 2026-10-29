"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { transitionAction } from "@/app/actions/tasks";
import {
  ACTION_LABEL,
  ACTIONS_REQUIRING_FOLLOW_UP,
  ACTIONS_REQUIRING_NOTE,
  type TaskAction,
} from "@/domain/task-rules";
import type { ActionState } from "@/lib/action-state";
import { cx } from "@/lib/ui";

const STYLE: Partial<Record<TaskAction, string>> = {
  START: "btn-primary",
  COMPLETE: "btn-primary",
  APPROVE: "btn-primary",
  SUBMIT_REVIEW: "btn-primary",
  RESUME: "btn-primary",
  RETURN: "btn-secondary",
  CANCEL: "btn-ghost text-red-700",
  REOPEN: "btn-secondary",
};

const NOTE_LABEL: Partial<Record<TaskAction, string>> = {
  WAIT_CLIENT: "Informação ou documento necessário",
  WAIT_THIRD: "O que está pendente com o terceiro",
  RETURN: "Justificativa da devolução",
  CANCEL: "Motivo do cancelamento",
  REOPEN: "Justificativa da reabertura",
  RESUME: "Como a pendência foi resolvida (opcional)",
};

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * Diálogo de transição: coleta motivo/data quando a ação exige e envia
 * para a mesma Server Action usada em todos os fluxos.
 */
export function TransitionDialog({
  taskId,
  taskTitle,
  action,
  onClose,
  onDone,
}: {
  taskId: string;
  taskTitle?: string;
  action: TaskAction;
  onClose: () => void;
  onDone?: (state: ActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(transitionAction.bind(null, taskId), null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const needsNote = ACTIONS_REQUIRING_NOTE.includes(action);
  const needsFollowUp = ACTIONS_REQUIRING_FOLLOW_UP.includes(action);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  useEffect(() => {
    if (state?.ok) {
      onDone?.(state);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <form action={formAction} className="p-5">
        <input type="hidden" name="action" value={action} />
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          {ACTION_LABEL[action]}
        </h2>
        {taskTitle && <p className="mt-0.5 text-sm text-slate-600">{taskTitle}</p>}
        <div className="mt-4 space-y-3">
          {(needsNote || action === "RESUME") && (
            <div>
              <label className="label" htmlFor={`${titleId}-note`}>
                {NOTE_LABEL[action] ?? "Observação"}
                {needsNote && <span className="text-red-600"> *</span>}
              </label>
              <textarea
                id={`${titleId}-note`}
                name="note"
                required={needsNote}
                minLength={needsNote ? 3 : undefined}
                rows={3}
                className="input"
                autoFocus
              />
            </div>
          )}
          {needsFollowUp && (
            <>
              <div>
                <label className="label" htmlFor={`${titleId}-resp`}>
                  Quem precisa responder
                </label>
                <input
                  id={`${titleId}-resp`}
                  name="respondent"
                  className="input"
                  placeholder={action === "WAIT_CLIENT" ? "Ex.: financeiro do cliente" : "Ex.: gerente do banco"}
                />
              </div>
              <div>
                <label className="label" htmlFor={`${titleId}-fu`}>
                  Próximo acompanhamento <span className="text-red-600">*</span>
                </label>
                <input id={`${titleId}-fu`} type="date" name="followUpDate" min={today()} required className="input" />
              </div>
            </>
          )}
          {!needsNote && !needsFollowUp && action !== "RESUME" && (
            <p className="text-sm text-slate-600">Confirma esta ação?</p>
          )}
        </div>
        {state?.error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Voltar
          </button>
          <button type="submit" className={action === "CANCEL" ? "btn-danger" : "btn-primary"} disabled={pending}>
            {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {ACTION_LABEL[action]}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Ações rápidas: executa direto quando não há dados a coletar; senão abre o diálogo. */
export function TaskActions({
  taskId,
  taskTitle,
  actions,
  size = "md",
}: {
  taskId: string;
  taskTitle?: string;
  actions: TaskAction[];
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<TaskAction | null>(null);
  const [state, formAction, pending] = useActionState(transitionAction.bind(null, taskId), null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.at, state?.ok, router]);

  if (actions.length === 0) return null;
  const direct = (a: TaskAction) => !ACTIONS_REQUIRING_NOTE.includes(a) && a !== "RESUME" && a !== "CANCEL";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) =>
          direct(a) ? (
            <form key={a} action={formAction}>
              <input type="hidden" name="action" value={a} />
              <button type="submit" disabled={pending} className={cx(STYLE[a] ?? "btn-secondary", size === "sm" && "btn-sm")}>
                {ACTION_LABEL[a]}
              </button>
            </form>
          ) : (
            <button
              key={a}
              type="button"
              className={cx(STYLE[a] ?? "btn-secondary", size === "sm" && "btn-sm")}
              onClick={() => setDialog(a)}
            >
              {ACTION_LABEL[a]}…
            </button>
          ),
        )}
        {pending && <Loader2 aria-label="Processando" className="h-4 w-4 animate-spin self-center text-slate-500" />}
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
      {dialog && (
        <TransitionDialog
          taskId={taskId}
          taskTitle={taskTitle}
          action={dialog}
          onClose={() => setDialog(null)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}
