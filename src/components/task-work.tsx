"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  addChecklistItemAction,
  addCommentAction,
  addEvidenceAction,
  removeChecklistItemAction,
  removeEvidenceAction,
  toggleChecklistItemAction,
  updatePendingAction,
} from "@/app/actions/tasks";
import { ActionForm, SubmitButton } from "./ui/action-form";
import { cx } from "@/lib/ui";

export function ChecklistItemRow({
  id,
  label,
  required,
  done,
  doneInfo,
  editable,
  removable,
}: {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
  doneInfo?: string;
  editable: boolean;
  removable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="flex items-start gap-3 py-2">
      <input
        id={`chk-${id}`}
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={done}
        disabled={!editable || pending}
        onChange={(e) =>
          start(async () => {
            const res = await toggleChecklistItemAction(id, e.target.checked);
            setError(res?.ok ? null : res?.error ?? "Erro");
            router.refresh();
          })
        }
      />
      <div className="flex-1">
        <label htmlFor={`chk-${id}`} className={cx("text-sm", done && "text-slate-500 line-through")}>
          {label}
          {required && <span className="ml-1 rounded bg-slate-100 px-1 text-xs text-slate-600 no-underline">obrigatório</span>}
        </label>
        {doneInfo && <p className="text-xs text-slate-500">{doneInfo}</p>}
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      {pending && <Loader2 aria-label="Salvando" className="h-4 w-4 animate-spin text-slate-400" />}
      {removable && (
        <ActionForm action={removeChecklistItemAction.bind(null, id)} confirm={`Remover o item "${label}"?`} showSuccess={false}>
          <button type="submit" className="btn-ghost btn-sm text-slate-400 hover:text-red-600" aria-label={`Remover item ${label}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </ActionForm>
      )}
    </li>
  );
}

export function AddChecklistItemForm({ taskId, allowRequired }: { taskId: string; allowRequired: boolean }) {
  return (
    <ActionForm action={addChecklistItemAction.bind(null, taskId)} resetOnSuccess showSuccess={false} className="mt-3">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="new-check" className="sr-only">
          Novo item do checklist
        </label>
        <input id="new-check" name="label" className="input min-w-48 flex-1" placeholder="Novo item do checklist" required />
        {allowRequired && (
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" name="required" /> Obrigatório
          </label>
        )}
        <SubmitButton className="btn-secondary" pendingText="Adicionando…">
          Adicionar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AddEvidenceForm({ taskId }: { taskId: string }) {
  return (
    <ActionForm action={addEvidenceAction.bind(null, taskId)} resetOnSuccess className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
      <label htmlFor="ev-url" className="sr-only">
        Link da evidência
      </label>
      <input id="ev-url" name="url" type="url" required className="input" placeholder="https://… (pasta, planilha, comprovante)" />
      <label htmlFor="ev-desc" className="sr-only">
        Descrição
      </label>
      <input id="ev-desc" name="description" className="input" placeholder="Descrição (opcional)" />
      <SubmitButton className="btn-secondary" pendingText="Salvando…">
        Adicionar link
      </SubmitButton>
    </ActionForm>
  );
}

export function RemoveEvidenceButton({ id }: { id: string }) {
  return (
    <ActionForm action={removeEvidenceAction.bind(null, id)} confirm="Remover esta evidência? A remoção fica registrada no histórico." showSuccess={false}>
      <button type="submit" className="btn-ghost btn-sm text-slate-400 hover:text-red-600" aria-label="Remover evidência">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </ActionForm>
  );
}

export function CommentForm({ taskId }: { taskId: string }) {
  return (
    <ActionForm action={addCommentAction.bind(null, taskId)} resetOnSuccess showSuccess={false} className="mt-3">
      <label htmlFor="comment" className="sr-only">
        Novo comentário
      </label>
      <textarea id="comment" name="body" rows={3} required className="input" placeholder="Escreva um comentário…" />
      <div className="mt-2 flex justify-end">
        <SubmitButton className="btn-secondary" pendingText="Enviando…">
          Comentar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PendingFollowUpForm({ pendingId, followUp, respondent }: { pendingId: string; followUp: string; respondent: string | null }) {
  return (
    <ActionForm action={updatePendingAction.bind(null, pendingId)} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" inlineFeedback>
      <div>
        <label className="label text-xs" htmlFor={`fu-${pendingId}`}>
          Próximo acompanhamento
        </label>
        <input id={`fu-${pendingId}`} type="date" name="followUpDate" defaultValue={followUp} required className="input" />
      </div>
      <div>
        <label className="label text-xs" htmlFor={`rs-${pendingId}`}>
          Quem precisa responder
        </label>
        <input id={`rs-${pendingId}`} name="respondent" defaultValue={respondent ?? ""} className="input" />
      </div>
      <div className="flex items-end">
        <SubmitButton className="btn-secondary">Reagendar</SubmitButton>
      </div>
    </ActionForm>
  );
}
