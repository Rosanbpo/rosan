"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, SubmitButton } from "./ui/action-form";

/** Excluir cliente: abre uma caixa que pede a senha de quem está logado. */
export function DeleteClient({ action, name }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn border border-red-200 bg-white text-red-700 hover:bg-red-50">
        <Trash2 aria-hidden className="h-4 w-4" /> Excluir
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Excluir cliente" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-3 p-5">
            <h2 className="text-base font-semibold text-red-700">Excluir {name}?</h2>
            <p className="text-sm text-slate-600">Isso apaga o cliente e tudo dele: tarefas, rotinas, notas e documentos. Não dá para desfazer. Para continuar, digite a sua senha.</p>
            <ActionForm action={action} className="space-y-3">
              <label className="block text-sm">
                Sua senha
                <input name="password" type="password" required autoFocus autoComplete="current-password" className="input mt-1 w-full" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
                <SubmitButton className="btn bg-red-600 text-white hover:bg-red-700" pendingText="Excluindo…">Excluir definitivamente</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      )}
    </>
  );
}
