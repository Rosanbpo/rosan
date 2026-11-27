import { CLIENT_STATUSES, CLIENT_STATUS_LABEL, JOURNEY_STAGES, ROLE_LABEL, STAGE_LABEL, SERVICE_OPTIONS, type Role } from "@/domain/enums";
import { SERVICE_LINES, SERVICE_LINE_LABEL } from "@/domain/pf-journey";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface ClientFormValues {
  legalName?: string;
  tradeName?: string;
  cnpj?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactChannels?: string | null;
  status?: string;
  services?: string[];
  serviceLines?: string[];
  startDate?: string | null;
  monthlyFee?: string;
  billingDay?: number | null;
  billingDay2?: number | null;
  firstInstallmentPct?: number;
  journeyStage?: string | null;
  software?: string | null;
  directCost?: string;
  notes?: string | null;
  responsibleOperatorId?: string | null;
  managerId?: string | null;
  memberIds?: string[];
}

export function ClientForm({
  action,
  people,
  values = {},
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  people: Array<{ id: string; name: string; role: Role }>;
  values?: ClientFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const extraServices = (values.services ?? []).filter((s) => !(SERVICE_OPTIONS as readonly string[]).includes(s));
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-id">
        <h2 id="sec-id" className="text-sm font-semibold md:col-span-2">
          Identificação
        </h2>
        <fieldset className="md:col-span-2">
          <legend className="label">Serviço contratado</legend>
          <p className="mb-2 text-xs text-slate-500">Define a jornada e as abas do painel. Para pessoa física, use o nome da pessoa nos campos de nome.</p>
          <div className="flex flex-wrap gap-4">
            {SERVICE_LINES.map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="serviceLines" value={l} defaultChecked={(values.serviceLines ?? ["BPO_FINANCEIRO"]).includes(l)} />
                {SERVICE_LINE_LABEL[l]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Razão social" name="legalName" required>
          <input id="legalName" name="legalName" required className="input" defaultValue={values.legalName} />
        </Field>
        <Field label="Nome fantasia" name="tradeName" required>
          <input id="tradeName" name="tradeName" required className="input" defaultValue={values.tradeName} />
        </Field>
        <Field label="CNPJ" name="cnpj" hint="Opcional. Validamos apenas os dígitos verificadores.">
          <input id="cnpj" name="cnpj" className="input" inputMode="numeric" defaultValue={values.cnpj ?? ""} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Status" name="status" required>
          <select id="status" name="status" className="input" defaultValue={values.status ?? "IMPLANTACAO"}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data de início" name="startDate">
          <input id="startDate" type="date" name="startDate" className="input" defaultValue={values.startDate ?? ""} />
        </Field>
        <Field label="Mensalidade (R$)" name="monthlyFee" hint="Valor mensal do contrato. Alimenta a carteira e a rentabilidade.">
          <input id="monthlyFee" name="monthlyFee" inputMode="decimal" className="input" defaultValue={values.monthlyFee ?? ""} placeholder="2.500,00" />
        </Field>
        <Field label="Etapa da jornada" name="journeyStage" hint="Em que ponto do relacionamento o cliente está.">
          <select id="journeyStage" name="journeyStage" className="input" defaultValue={values.journeyStage ?? ""}>
            <option value="">Sem etapa</option>
            {JOURNEY_STAGES.map((st) => (
              <option key={st} value={st}>
                {STAGE_LABEL[st]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sistema financeiro" name="software" hint="ERP ou sistema que o cliente usa (Omie, Conta Azul, Nibo…).">
          <input id="software" name="software" className="input" defaultValue={values.software ?? ""} />
        </Field>
        <Field label="Custo direto mensal (R$)" name="directCost" hint="Ferramentas, taxas ou outros custos só deste cliente. Entra na rentabilidade.">
          <input id="directCost" name="directCost" inputMode="decimal" className="input" defaultValue={values.directCost ?? ""} placeholder="0,00" />
        </Field>
        <Field label="Dia de vencimento" name="billingDay" hint="Dia do mês em que a mensalidade é cobrada (1 a 31).">
          <input id="billingDay" name="billingDay" type="number" min={1} max={31} className="input" defaultValue={values.billingDay ?? ""} />
        </Field>
        <Field label="Segundo vencimento (opcional)" name="billingDay2" hint="Para o cliente pagar em duas parcelas no mês.">
          <input id="billingDay2" name="billingDay2" type="number" min={1} max={31} className="input" defaultValue={values.billingDay2 ?? ""} />
        </Field>
        <Field label="% no primeiro vencimento" name="firstInstallmentPct" hint="Só vale com dois vencimentos. O restante vai no segundo.">
          <input id="firstInstallmentPct" name="firstInstallmentPct" type="number" min={1} max={99} className="input" defaultValue={values.firstInstallmentPct ?? 50} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-contact">
        <h2 id="sec-contact" className="text-sm font-semibold md:col-span-2">
          Contato principal
        </h2>
        <Field label="Nome do contato" name="contactName">
          <input id="contactName" name="contactName" className="input" defaultValue={values.contactName ?? ""} />
        </Field>
        <Field label="E-mail" name="contactEmail">
          <input id="contactEmail" type="email" name="contactEmail" className="input" defaultValue={values.contactEmail ?? ""} />
        </Field>
        <Field label="Telefone / WhatsApp" name="contactPhone">
          <input id="contactPhone" name="contactPhone" className="input" defaultValue={values.contactPhone ?? ""} />
        </Field>
        <Field label="Outros canais" name="contactChannels" hint="Ex.: grupo de WhatsApp, portal do cliente, e-mail do financeiro">
          <input id="contactChannels" name="contactChannels" className="input" defaultValue={values.contactChannels ?? ""} />
        </Field>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="sec-team">
        <h2 id="sec-team" className="text-sm font-semibold md:col-span-2">
          Equipe e acesso
        </h2>
        <Field label="Operador responsável" name="responsibleOperatorId" hint="Responsável padrão das tarefas de rotina sem responsável definido.">
          <select id="responsibleOperatorId" name="responsibleOperatorId" className="input" defaultValue={values.responsibleOperatorId ?? ""}>
            <option value="">—</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gestor" name="managerId">
          <select id="managerId" name="managerId" className="input" defaultValue={values.managerId ?? ""}>
            <option value="">—</option>
            {people
              .filter((p) => p.role !== "OPERADOR")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({ROLE_LABEL[p.role]})
                </option>
              ))}
          </select>
        </Field>
        <fieldset className="md:col-span-2">
          <legend className="label">Outros usuários com acesso a este cliente</legend>
          <p className="mb-2 text-xs text-slate-500">
            O operador responsável e o gestor recebem acesso automaticamente. Administradores acessam todos os clientes.
          </p>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {people
              .filter((p) => p.role !== "ADMIN")
              .map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="memberIds" value={p.id} defaultChecked={values.memberIds?.includes(p.id)} />
                  {p.name} <span className="text-xs text-slate-500">({ROLE_LABEL[p.role]})</span>
                </label>
              ))}
          </div>
        </fieldset>
      </section>

      <section className="card grid gap-4 p-5" aria-labelledby="sec-ops">
        <h2 id="sec-ops" className="text-sm font-semibold">
          Operação
        </h2>
        <fieldset>
          <legend className="label">Serviços contratados</legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...SERVICE_OPTIONS, ...extraServices].map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="services" value={s} defaultChecked={values.services?.includes(s)} />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Observações operacionais" name="notes" hint="Particularidades, acessos necessários (não registre senhas aqui), horários de corte etc.">
          <textarea id="notes" name="notes" rows={4} className="input" defaultValue={values.notes ?? ""} />
        </Field>
      </section>

      <div className="flex justify-end gap-2">
        <a href={cancelHref} className="btn-secondary">
          Cancelar
        </a>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
