"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createPendingAction } from "@/app/actions/pendings";
import { PRIORITIES, PRIORITY_LABEL } from "@/domain/enums";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

/** Botão "+ Nova pendência" com janela de cadastro rápido. */
export function NewPending({ clients, today }: { clients: Array<{ id: string; tradeName: string }>; today: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="h-4 w-4" /> Nova pendência
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nova pendência" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nova pendência</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <ActionForm action={createPendingAction} className="space-y-3" onSuccess={() => { setOpen(false); router.refresh(); }}>
              <Field label="O que está pendente" name="description" required>
                <input id="description" name="description" required minLength={2} className="input" placeholder="Ex.: Extrato do Itaú de outubro" autoFocus />
              </Field>
              <Field label="Cliente" name="clientId" required>
                <select id="clientId" name="clientId" required className="input" defaultValue="">
                  <option value="" disabled>Selecionar cliente…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.tradeName}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cobrar em" name="followUpDate" required>
                  <input id="followUpDate" name="followUpDate" type="date" required className="input" defaultValue={today} />
                </Field>
                <Field label="Prioridade" name="priority">
                  <select id="priority" name="priority" className="input" defaultValue="NORMAL">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Quem precisa responder (opcional)" name="respondent">
                <input id="respondent" name="respondent" className="input" />
              </Field>
              <Field label="Observações (opcional)" name="notes">
                <textarea id="notes" name="notes" rows={2} className="input" />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
                <SubmitButton>Criar pendência</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
