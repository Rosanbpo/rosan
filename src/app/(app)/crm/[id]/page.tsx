import Link from "next/link";
import { Pencil } from "lucide-react";
import { LEAD_ACTIVITY_KINDS, LEAD_ACTIVITY_LABEL, LEAD_STAGES, LEAD_STAGE_LABEL, type LeadStage } from "@/domain/enums";
import { dbDateToLocalDate } from "@/domain/dates";
import { can } from "@/domain/permissions";
import { Card, PageHeader } from "@/components/ui/layout";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { addLeadActivityAction, changeLeadStageAction, convertLeadAction } from "@/app/actions/crm";
import { fmtDateTime, fmtLocalDate, fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getLead } from "@/server/services/leads";

export const metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const lead = await orNotFound(getLead(actor, id));
  const stage = lead.stage as LeadStage;
  const canConvert = can(actor, "clients.manage") && !lead.convertedClientId;

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/crm", label: "CRM comercial" }}
        title={lead.companyName}
        description={`${LEAD_STAGE_LABEL[stage]}${lead.source ? ` · origem: ${lead.source}` : ""}`}
        actions={
          <>
            <Link href={`/crm/${id}/editar`} className="btn-secondary">
              <Pencil aria-hidden className="h-4 w-4" /> Editar
            </Link>
            {canConvert && stage !== "PERDIDO" && (
              <ConfirmAction
                action={convertLeadAction.bind(null, id)}
                label="Converter em cliente"
                className="btn-primary"
                confirm="Criar um cliente em implantação a partir deste lead? Os dados de contato e a mensalidade serão copiados."
              />
            )}
          </>
        }
      />

      {lead.convertedClient && (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Convertido em cliente:{" "}
          <Link className="font-medium underline" href={`/clientes/${lead.convertedClient.id}`}>
            {lead.convertedClient.tradeName}
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Etapa do funil">
            <ActionForm action={changeLeadStageAction.bind(null, id)} className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-start">
              <Field label="Mover para" name="stage">
                <select id="stage" name="stage" className="input" defaultValue={stage} disabled={!!lead.convertedClientId}>
                  {LEAD_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STAGE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Motivo (obrigatório se perdido)" name="lostReason">
                <input id="lostReason" name="lostReason" className="input" defaultValue={lead.lostReason ?? ""} placeholder="Preço, escolheu outro BPO, sem retorno…" />
              </Field>
              <div className="sm:pt-6">
                <SubmitButton>Atualizar</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card title="Histórico de contato">
            <ActionForm action={addLeadActivityAction.bind(null, id)} resetOnSuccess className="mb-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start">
              <Field label="Tipo" name="kind">
                <select id="kind" name="kind" className="input">
                  {LEAD_ACTIVITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {LEAD_ACTIVITY_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Registro" name="body">
                <input id="body" name="body" required className="input" placeholder="O que foi conversado?" />
              </Field>
              <div className="sm:pt-6">
                <SubmitButton>Registrar</SubmitButton>
              </div>
            </ActionForm>
            {lead.activities.length ? (
              <ul className="space-y-3">
                {lead.activities.map((a) => (
                  <li key={a.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="text-xs text-slate-500">
                      {LEAD_ACTIVITY_LABEL[a.kind as keyof typeof LEAD_ACTIVITY_LABEL] ?? a.kind} · {a.author.name} · {fmtDateTime(a.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{a.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhum registro ainda.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Negócio">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Mensalidade esperada</dt>
                <dd className="font-medium">{fmtMoney(lead.expectedFee === null ? null : Number(lead.expectedFee))}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Serviços de interesse</dt>
                <dd>{lead.servicesInterest.length ? lead.servicesInterest.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Próxima ação</dt>
                <dd>
                  {lead.nextAction ?? "—"}
                  {lead.nextActionAt && ` · ${fmtLocalDate(dbDateToLocalDate(lead.nextActionAt))}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Responsável</dt>
                <dd>{lead.owner?.name ?? "—"}</dd>
              </div>
              {lead.lostReason && (
                <div>
                  <dt className="text-xs text-slate-500">Motivo da perda</dt>
                  <dd>{lead.lostReason}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card title="Contato">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Nome</dt>
                <dd>{lead.contactName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Telefone</dt>
                <dd>{lead.contactPhone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">E-mail</dt>
                <dd className="break-all">{lead.contactEmail ?? "—"}</dd>
              </div>
            </dl>
          </Card>
          {lead.notes && (
            <Card title="Observações">
              <p className="text-sm whitespace-pre-wrap text-slate-700">{lead.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
