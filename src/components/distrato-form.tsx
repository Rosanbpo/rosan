"use client";

import Link from "next/link";
import type { Clause } from "@/domain/contract";
import { buildDistratoClauses } from "@/domain/contract";
import type { ActionState } from "@/lib/action-state";
import { ClauseEditor } from "./clause-editor";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface DistratoFormValues {
  endDate: string | null;
  pendingMonthly: string;
  unbilled: string;
  credits: string;
  settleDays: number | null;
  clauses: Clause[];
}

export function DistratoForm({
  action,
  values,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values: DistratoFormValues;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-4" aria-labelledby="d-valores">
        <h2 id="d-valores" className="text-sm font-semibold md:col-span-4">
          Encerramento e valores
        </h2>
        <Field label="Data de encerramento dos serviços" name="endDate">
          <input id="endDate" name="endDate" type="date" className="input" defaultValue={values.endDate ?? ""} />
        </Field>
        <Field label="Mensalidades em aberto (R$)" name="pendingMonthly">
          <input id="pendingMonthly" name="pendingMonthly" inputMode="decimal" className="input" defaultValue={values.pendingMonthly} />
        </Field>
        <Field label="Serviços executados e não faturados (R$)" name="unbilled">
          <input id="unbilled" name="unbilled" inputMode="decimal" className="input" defaultValue={values.unbilled} />
        </Field>
        <Field label="Créditos a devolver (R$)" name="credits">
          <input id="credits" name="credits" inputMode="decimal" className="input" defaultValue={values.credits} />
        </Field>
        <Field label="Prazo para quitação (dias)" name="settleDays">
          <input id="settleDays" name="settleDays" type="number" min={1} max={365} className="input" defaultValue={values.settleDays ?? ""} />
        </Field>
        <p className="text-xs text-slate-500 md:col-span-3">O saldo de quitação é calculado: mensalidades em aberto + serviços não faturados − créditos. Campos em branco ficam para preencher à mão no papel.</p>
      </section>

      <section className="card p-5" aria-labelledby="d-clausulas">
        <h2 id="d-clausulas" className="mb-3 text-sm font-semibold">
          Cláusulas do distrato
        </h2>
        <ClauseEditor name="distratoClauses" initial={values.clauses} defaults={buildDistratoClauses()} />
      </section>

      <div className="flex gap-2">
        <SubmitButton>Salvar distrato</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </ActionForm>
  );
}
