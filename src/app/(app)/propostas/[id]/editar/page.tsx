import { PageHeader } from "@/components/ui/layout";
import { ProposalForm } from "@/components/proposal-form";
import { updateProposalAction } from "@/app/actions/proposals";
import { PLAN_PRESETS } from "@/domain/plans";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProposal } from "@/server/services/proposals";

export const metadata = { title: "Editar proposta" };

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const p = await orNotFound(getProposal(actor, id));
  return (
    <>
      <PageHeader title={`Editar proposta ${p.number}`} breadcrumb={{ href: `/propostas/${id}`, label: "Voltar à proposta" }} />
      <ProposalForm
        action={updateProposalAction.bind(null, id)}
        plans={PLAN_PRESETS}
        submitLabel="Salvar alterações"
        cancelHref={`/propostas/${id}`}
        values={{
          leadId: p.leadId,
          planName: p.planName,
          companyName: p.companyName,
          contactName: p.contactName,
          contactEmail: p.contactEmail,
          intro: p.intro,
          services: p.services.join("\n"),
          volumes: p.volumes.join("\n"),
          exclusions: p.exclusions.join("\n"),
          monthlyFee: p.monthlyFee.toFixed(2).replace(".", ","),
          billingDay: p.billingDay,
          termMonths: p.termMonths,
          validUntil: p.validUntilLocal,
          notes: p.notes,
        }}
      />
    </>
  );
}
