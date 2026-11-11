import Link from "next/link";
import { LEAD_SOURCES, ROLE_LABEL, SERVICE_OPTIONS, type Role } from "@/domain/enums";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface LeadFormValues {
  companyName?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  cnpj?: string | null;
  source?: string | null;
  expectedFee?: string;
  servicesInterest?: string[];
  ownerId?: string | null;
  nextActionAt?: string | null;
  nextAction?: string | null;
  notes?: string | null;
}

export function LeadForm({
  action,
  people,
  values = {},
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  people: Array<{ id: string; name: string; role: Role }>;
  values?: LeadFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const selected = values.servicesInterest ?? [];
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-lead">
        <h2 id="sec-lead" className="text-sm font-semibold md:col-span-2">
          Empresa e contato
        </h2>
        <Field label="Empresa" name="companyName" required>
          <input id="companyName" name="companyName" required className="input" defaultValue={values.companyName} />
        </Field>
        <Field label="CNPJ" name="cnpj" hint="Opcional.">
          <input id="cnpj" name="cnpj" className="input" inputMode="numeric" defaultValue={values.cnpj ?? ""} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Nome do contato" name="contactName">
          <input id="contactName" name="contactName" className="input" defaultValue={values.contactName ?? ""} />
        </Field>
        <Field label="Telefone / WhatsApp" name="contactPhone">
          <input id="contactPhone" name="contactPhone" className="input" defaultValue={values.contactPhone ?? ""} />
        </Field>
        <Field label="E-mail" name="contactEmail">
          <input id="contactEmail" type="email" name="contactEmail" className="input" defaultValue={values.contactEmail ?? ""} />
        </Field>
        <Field label="Origem do lead" name="source">
          <input id="source" name="source" list="lead-sources" className="input" defaultValue={values.source ?? ""} placeholder="Indicação, Instagram…" />
          <datalist id="lead-sources">
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-deal">
        <h2 id="sec-deal" className="text-sm font-semibold md:col-span-2">
          Negócio
        </h2>
        <Field label="Mensalidade esperada (R$)" name="expectedFee" hint="Valor mensal estimado do contrato.">
          <input id="expectedFee" name="expectedFee" inputMode="decimal" className="input" defaultValue={values.expectedFee ?? ""} placeholder="2.500,00" />
        </Field>
        <Field label="Responsável comercial" name="ownerId">
          <select id="ownerId" name="ownerId" className="input" defaultValue={values.ownerId ?? ""}>
            <option value="">Eu mesma(o)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="md:col-span-2">
          <legend className="label">Serviços de interesse</legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="servicesInterest" value={s} defaultChecked={selected.includes(s)} /> {s}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Próxima ação" name="nextAction" hint="Ex.: enviar proposta, ligar na sexta">
          <input id="nextAction" name="nextAction" className="input" defaultValue={values.nextAction ?? ""} />
        </Field>
        <Field label="Data da próxima ação" name="nextActionAt">
          <input id="nextActionAt" type="date" name="nextActionAt" className="input" defaultValue={values.nextActionAt ?? ""} />
        </Field>
        <Field label="Observações" name="notes" className="md:col-span-2">
          <textarea id="notes" name="notes" rows={4} className="input" defaultValue={values.notes ?? ""} />
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
