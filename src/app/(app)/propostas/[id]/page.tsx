import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { instantToLocalDate } from "@/domain/dates";
import { PROPOSAL_STATUS_LABEL, isProposalExpired, type ProposalStatus } from "@/domain/proposal";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { ConfirmAction } from "@/components/confirm-action";
import { setProposalStatusAction } from "@/app/actions/proposals";
import { fmtDateTime, fmtLocalDate, fmtMoney } from "@/lib/format";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProposal } from "@/server/services/proposals";
import { splitPair } from "@/domain/proposal";

export const metadata = { title: "Proposta" };

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const p = await orNotFound(getProposal(actor, id));
  const status = p.status as ProposalStatus;
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const expired = isProposalExpired(status, p.validUntilLocal, today);

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/propostas", label: "Propostas" }}
        title={`Proposta ${p.number} · ${p.companyName}`}
        description={`${p.planName} · criada por ${p.createdBy.name} em ${fmtDateTime(p.createdAt)}`}
        actions={
          <>
            <Link href={`/documento/proposta/${id}`} className="btn-primary" target="_blank">
              <FileText aria-hidden className="h-4 w-4" /> Ver documento / PDF
            </Link>
            {status !== "ACEITA" && (
              <Link href={`/propostas/${id}/editar`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Situação" value={expired ? "Vencida" : PROPOSAL_STATUS_LABEL[status]} tone={status === "ACEITA" ? "success" : expired ? "warning" : "default"} />
        <Stat label="Mensalidade" value={fmtMoney(p.monthlyFee)} hint={`Vence dia ${p.billingDay} · ${p.termMonths} meses`} />
        <Stat label="Válida até" value={fmtLocalDate(p.validUntilLocal)} tone={expired ? "danger" : "default"} />
        <Stat label="Lead" value={p.lead ? <Link className="text-base text-brand-700 hover:underline" href={`/crm/${p.lead.id}`}>{p.lead.companyName}</Link> : "—"} />
      </div>

      <Card title="Andamento" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {status === "RASCUNHO" && (
            <ConfirmAction
              action={setProposalStatusAction.bind(null, id, "ENVIADA")}
              label="Marcar como enviada"
              className="btn-secondary"
              confirm="Marcar a proposta como enviada? O lead vai para a etapa “Proposta enviada”."
            />
          )}
          {(status === "ENVIADA" || status === "RECUSADA") && (
            <ConfirmAction action={setProposalStatusAction.bind(null, id, "ACEITA")} label="Cliente aceitou" className="btn-secondary" confirm="Registrar que o cliente aceitou a proposta? Depois disso ela não poderá ser editada." />
          )}
          {status === "ENVIADA" && (
            <ConfirmAction action={setProposalStatusAction.bind(null, id, "RECUSADA")} label="Cliente recusou" className="btn-ghost" confirm="Registrar que o cliente recusou a proposta?" />
          )}
          {status !== "RASCUNHO" && status !== "ACEITA" && (
            <ConfirmAction action={setProposalStatusAction.bind(null, id, "RASCUNHO")} label="Voltar para rascunho" className="btn-ghost" confirm="Voltar a proposta para rascunho?" />
          )}
          {status === "ACEITA" && <p className="text-sm text-slate-600">Proposta aceita. Converta o lead em cliente para iniciar a implantação.</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Serviços incluídos">
          <ul className="space-y-2 text-sm">
            {p.services.map((s) => {
              const { left, right } = splitPair(s);
              return (
                <li key={s}>
                  <span className="font-medium">{left}</span>
                  {right && <span className="text-slate-500"> — {right}</span>}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Limites mensais">
          {p.volumes.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {p.volumes.map((v) => {
                const { left, right } = splitPair(v);
                return (
                  <li key={v} className="flex justify-between py-1.5">
                    <span>{left}</span>
                    <span className="font-medium">{right}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sem limites informados.</p>
          )}
        </Card>
      </div>
    </>
  );
}
