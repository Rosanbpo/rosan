"use client";

import Link from "next/link";
import type { Clause } from "@/domain/contract";
import { buildContractClauses } from "@/domain/contract";
import type { ActionState } from "@/lib/action-state";
import { ClauseEditor } from "./clause-editor";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface ContractFormValues {
  proposalId?: string | null;
  clientId?: string | null;
  partyName?: string;
  partyDocument?: string | null;
  partyAddress?: string | null;
  repName?: string | null;
  repCpf?: string | null;
  issuerRepName?: string | null;
  issuerRepRole?: string | null;
  issuerRepCpf?: string | null;
  monthlyFee?: string;
  billingDay?: number;
  termMonths?: number;
  startDate?: string | null;
  signDate?: string | null;
  signCity?: string | null;
  services?: string;
  volumes?: string;
  clauses: Clause[];
}

export function ContractForm({
  action,
  values,
  clients,
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values: ContractFormValues;
  clients: { id: string; label: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      {values.proposalId && <input type="hidden" name="proposalId" value={values.proposalId} />}

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="c-contratante">
        <h2 id="c-contratante" className="text-sm font-semibold md:col-span-2">
          Contratante (cliente)
        </h2>
        <Field label="Razão social" name="partyName" required>
          <input id="partyName" name="partyName" required className="input" defaultValue={values.partyName} />
        </Field>
        <Field label="CNPJ/CPF" name="partyDocument">
          <input id="partyDocument" name="partyDocument" className="input" defaultValue={values.partyDocument ?? ""} />
        </Field>
        <Field label="Endereço" name="partyAddress" className="md:col-span-2">
          <input id="partyAddress" name="partyAddress" className="input" defaultValue={values.partyAddress ?? ""} />
        </Field>
        <Field label="Representado(a) por" name="repName">
          <input id="repName" name="repName" className="input" defaultValue={values.repName ?? ""} />
        </Field>
        <Field label="CPF do representante" name="repCpf">
          <input id="repCpf" name="repCpf" className="input" defaultValue={values.repCpf ?? ""} />
        </Field>
        <Field label="Cliente cadastrado (opcional)" name="clientId" className="md:col-span-2" hint="Vincula o contrato à ficha do cliente.">
          <select id="clientId" name="clientId" className="input" defaultValue={values.clientId ?? ""}>
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-3" aria-labelledby="c-contratada">
        <h2 id="c-contratada" className="text-sm font-semibold md:col-span-3">
          Contratada (Rosan) — representante
        </h2>
        <p className="-mt-2 text-xs text-slate-500 md:col-span-3">A razão social, o CNPJ e o e-mail da Rosan vêm de Configurações → Empresa.</p>
        <Field label="Representada por" name="issuerRepName">
          <input id="issuerRepName" name="issuerRepName" className="input" defaultValue={values.issuerRepName ?? ""} />
        </Field>
        <Field label="Cargo" name="issuerRepRole">
          <input id="issuerRepRole" name="issuerRepRole" className="input" defaultValue={values.issuerRepRole ?? "Sócio(a) Administrador(a)"} />
        </Field>
        <Field label="CPF" name="issuerRepCpf">
          <input id="issuerRepCpf" name="issuerRepCpf" className="input" defaultValue={values.issuerRepCpf ?? ""} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-4" aria-labelledby="c-valores">
        <h2 id="c-valores" className="text-sm font-semibold md:col-span-4">
          Valores, prazo e assinatura
        </h2>
        <Field label="Mensalidade (R$)" name="monthlyFee" required>
          <input id="monthlyFee" name="monthlyFee" required inputMode="decimal" className="input" defaultValue={values.monthlyFee} placeholder="1.000,00" />
        </Field>
        <Field label="Vence todo dia" name="billingDay">
          <input id="billingDay" name="billingDay" type="number" min={1} max={31} className="input" defaultValue={values.billingDay ?? 10} />
        </Field>
        <Field label="Vigência (meses)" name="termMonths">
          <input id="termMonths" name="termMonths" type="number" min={1} max={60} className="input" defaultValue={values.termMonths ?? 6} />
        </Field>
        <Field label="Início da vigência" name="startDate">
          <input id="startDate" name="startDate" type="date" className="input" defaultValue={values.startDate ?? ""} />
        </Field>
        <Field label="Cidade/UF (foro e assinatura)" name="signCity" className="md:col-span-2">
          <input id="signCity" name="signCity" className="input" defaultValue={values.signCity ?? ""} placeholder="Ex.: São Paulo/SP" />
        </Field>
        <Field label="Data da assinatura" name="signDate" hint="Pode deixar em branco e preencher à mão.">
          <input id="signDate" name="signDate" type="date" className="input" defaultValue={values.signDate ?? ""} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="c-escopo">
        <h2 id="c-escopo" className="text-sm font-semibold md:col-span-2">
          Escopo
        </h2>
        <Field label="Serviços contratados" name="services" required hint="Uma linha por serviço: Serviço | Descrição">
          <textarea id="services" name="services" required rows={10} className="input font-mono text-xs" defaultValue={values.services} />
        </Field>
        <Field label="Limites mensais" name="volumes" hint="Uma linha por item: Descrição | Limite">
          <textarea id="volumes" name="volumes" rows={10} className="input font-mono text-xs" defaultValue={values.volumes} />
        </Field>
      </section>

      <section className="card p-5" aria-labelledby="c-clausulas">
        <h2 id="c-clausulas" className="mb-3 text-sm font-semibold">
          Cláusulas do contrato
        </h2>
        <ClauseEditor name="clauses" initial={values.clauses} defaults={buildContractClauses()} />
      </section>

      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </ActionForm>
  );
}
