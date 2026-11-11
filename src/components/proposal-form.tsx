"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlanPreset } from "@/domain/plans";
import { EXCLUSIONS_DEFAULT } from "@/domain/plans";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface ProposalFormValues {
  leadId?: string | null;
  planName?: string;
  companyName?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  intro?: string | null;
  services?: string;
  volumes?: string;
  exclusions?: string;
  monthlyFee?: string;
  billingDay?: number;
  termMonths?: number;
  validUntil?: string;
  notes?: string | null;
}

function feeText(n: number | null) {
  return n === null ? "" : n.toFixed(2).replace(".", ",");
}

export function ProposalForm({
  action,
  plans,
  values,
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  plans: PlanPreset[];
  values: ProposalFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [planName, setPlanName] = useState(values.planName ?? plans[0].name);
  const [services, setServices] = useState(values.services ?? plans[0].services.join("\n"));
  const [volumes, setVolumes] = useState(values.volumes ?? plans[0].volumes.join("\n"));
  const [exclusions, setExclusions] = useState(values.exclusions ?? EXCLUSIONS_DEFAULT.join("\n"));
  const [fee, setFee] = useState(values.monthlyFee ?? feeText(plans[0].suggestedFee));

  function choosePlan(name: string) {
    setPlanName(name);
    const plan = plans.find((p) => p.name === name);
    if (!plan || plan.key === "PERSONALIZADO") return;
    if (!window.confirm("Trocar o plano substitui os serviços, limites e a mensalidade sugerida. Continuar?")) {
      return;
    }
    setServices(plan.services.join("\n"));
    setVolumes(plan.volumes.join("\n"));
    setFee(feeText(plan.suggestedFee));
  }

  const plan = plans.find((p) => p.name === planName);

  return (
    <ActionForm action={action} className="space-y-6">
      {values.leadId && <input type="hidden" name="leadId" value={values.leadId} />}

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-cliente">
        <h2 id="sec-cliente" className="text-sm font-semibold md:col-span-2">
          Para quem é a proposta
        </h2>
        <Field label="Empresa" name="companyName" required>
          <input id="companyName" name="companyName" required className="input" defaultValue={values.companyName} />
        </Field>
        <Field label="Nome do contato" name="contactName">
          <input id="contactName" name="contactName" className="input" defaultValue={values.contactName ?? ""} />
        </Field>
        <Field label="E-mail do contato" name="contactEmail">
          <input id="contactEmail" name="contactEmail" type="email" className="input" defaultValue={values.contactEmail ?? ""} />
        </Field>
        <Field label="Validade da proposta" name="validUntil" required>
          <input id="validUntil" name="validUntil" type="date" required className="input" defaultValue={values.validUntil} />
        </Field>
        <Field label="Mensagem de abertura" name="intro" className="md:col-span-2" hint="Opcional. Se ficar em branco, usamos um texto padrão.">
          <textarea id="intro" name="intro" rows={3} className="input" defaultValue={values.intro ?? ""} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-4" aria-labelledby="sec-plano">
        <h2 id="sec-plano" className="text-sm font-semibold md:col-span-4">
          Plano e investimento
        </h2>
        <Field label="Plano" name="planName" required className="md:col-span-2" hint={plan?.audience}>
          <select id="planName" name="planName" className="input" value={planName} onChange={(e) => choosePlan(e.target.value)}>
            {plans.map((p) => (
              <option key={p.key} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mensalidade (R$)" name="monthlyFee" required hint={plan?.suggestedFee ? "Valor sugerido pela planilha; ajuste à vontade." : undefined}>
          <input id="monthlyFee" name="monthlyFee" required inputMode="decimal" className="input" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="1.000,00" />
        </Field>
        <Field label="Vence todo dia" name="billingDay">
          <input id="billingDay" name="billingDay" type="number" min={1} max={31} className="input" defaultValue={values.billingDay ?? 10} />
        </Field>
        <Field label="Vigência (meses)" name="termMonths">
          <input id="termMonths" name="termMonths" type="number" min={1} max={60} className="input" defaultValue={values.termMonths ?? 12} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-escopo">
        <h2 id="sec-escopo" className="text-sm font-semibold md:col-span-2">
          Escopo
        </h2>
        <Field label="Serviços incluídos" name="services" required className="md:col-span-2" hint="Uma linha por serviço, no formato: Serviço | Descrição">
          <textarea id="services" name="services" required rows={10} className="input font-mono text-xs" value={services} onChange={(e) => setServices(e.target.value)} />
        </Field>
        <Field label="Limites mensais" name="volumes" hint="Uma linha por item, no formato: Descrição | Limite">
          <textarea id="volumes" name="volumes" rows={8} className="input font-mono text-xs" value={volumes} onChange={(e) => setVolumes(e.target.value)} />
        </Field>
        <Field label="Fora do escopo" name="exclusions" hint="Uma linha por item.">
          <textarea id="exclusions" name="exclusions" rows={8} className="input font-mono text-xs" value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
        </Field>
        <Field label="Observações" name="notes" className="md:col-span-2" hint="Aparecem ao final da proposta (opcional).">
          <textarea id="notes" name="notes" rows={3} className="input" defaultValue={values.notes ?? ""} />
        </Field>
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
