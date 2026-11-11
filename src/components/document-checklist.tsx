"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { addDocumentRequirementAction, applyDefaultDocumentsAction, removeDocumentRequirementAction, toggleDocumentAction } from "@/app/actions/documents";
import { shiftCompetence } from "@/domain/documents";
import { fmtCompetence, fmtDate } from "@/lib/format";
import { ActionForm } from "./ui/action-form";

export interface DocumentItem {
  id: string;
  name: string;
  required: boolean;
  receivedAt: string | null;
  receivedBy: string | null;
}

export function DocumentChecklist({
  clientId,
  competence,
  items,
  canConfigure,
}: {
  clientId: string;
  competence: string;
  items: DocumentItem[];
  canConfigure: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const base = `/clientes/${clientId}`;
  const required = items.filter((i) => i.required);
  const got = required.filter((i) => i.receivedAt).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link aria-label="Mês anterior" className="icon-btn" href={`${base}?competencia=${shiftCompetence(competence, -1)}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-16 text-center text-sm font-semibold">{fmtCompetence(competence)}</span>
          <Link aria-label="Próximo mês" className="icon-btn" href={`${base}?competencia=${shiftCompetence(competence, 1)}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {required.length > 0 && (
          <span className={`text-xs font-medium ${got === required.length ? "text-emerald-700" : "text-amber-700"}`}>
            {got}/{required.length} obrigatórios recebidos
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum documento configurado para este cliente.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-3 py-2">
              <input
                id={`doc-${i.id}`}
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={!!i.receivedAt}
                disabled={pending}
                onChange={(e) =>
                  start(async () => {
                    const res = await toggleDocumentAction(i.id, competence, e.target.checked);
                    setError(res?.ok ? null : res?.error ?? "Erro");
                    router.refresh();
                  })
                }
              />
              <div className="flex-1">
                <label htmlFor={`doc-${i.id}`} className={`text-sm ${i.receivedAt ? "text-slate-500 line-through" : ""}`}>
                  {i.name}
                  {!i.required && <span className="ml-1 rounded bg-slate-100 px-1 text-xs text-slate-600 no-underline">opcional</span>}
                </label>
                {i.receivedAt && (
                  <p className="text-xs text-slate-500">
                    Recebido em {fmtDate(new Date(i.receivedAt))}
                    {i.receivedBy ? ` · ${i.receivedBy}` : ""}
                  </p>
                )}
              </div>
              {canConfigure && (
                <ActionForm action={removeDocumentRequirementAction.bind(null, clientId, i.id)} confirm={`Remover "${i.name}" da lista deste cliente?`} showSuccess={false}>
                  <button type="submit" className="btn-ghost btn-sm text-slate-400 hover:text-red-600" aria-label={`Remover ${i.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
      {pending && <Loader2 aria-label="Salvando" className="h-4 w-4 animate-spin text-slate-400" />}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}

      {canConfigure && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <ActionForm action={addDocumentRequirementAction.bind(null, clientId)} resetOnSuccess inlineFeedback className="flex gap-2">
            <input name="name" required maxLength={150} className="input" placeholder="Novo documento (ex.: Extrato da conta X)" aria-label="Nome do documento" />
            <button type="submit" className="btn-secondary whitespace-nowrap">
              Incluir
            </button>
          </ActionForm>
          <ActionForm action={applyDefaultDocumentsAction.bind(null, clientId)} inlineFeedback>
            <button type="submit" className="text-xs text-brand-700 hover:underline">
              Incluir lista padrão (extratos, notas fiscais, comprovantes…)
            </button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
