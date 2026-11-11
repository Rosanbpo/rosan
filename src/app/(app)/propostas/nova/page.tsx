import { PageHeader } from "@/components/ui/layout";
import { ProposalForm } from "@/components/proposal-form";
import { createProposalAction } from "@/app/actions/proposals";
import { instantToLocalDate } from "@/domain/dates";
import { PLAN_PRESETS } from "@/domain/plans";
import { defaultValidUntil } from "@/domain/proposal";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { orNotFound, str } from "@/server/page-utils";
import { getLead } from "@/server/services/leads";

export const metadata = { title: "Nova proposta" };

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission("crm.manage");
  const sp = await searchParams;
  const leadId = str(sp, "leadId");
  const lead = leadId ? await orNotFound(getLead(actor, leadId)) : null;
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const fee = lead?.expectedFee === null || lead?.expectedFee === undefined ? undefined : Number(lead.expectedFee).toFixed(2).replace(".", ",");

  return (
    <>
      <PageHeader title="Nova proposta" breadcrumb={leadId ? { href: `/crm/${leadId}`, label: "Voltar ao lead" } : { href: "/propostas", label: "Propostas" }} />
      <ProposalForm
        action={createProposalAction}
        plans={PLAN_PRESETS}
        submitLabel="Criar proposta"
        cancelHref={leadId ? `/crm/${leadId}` : "/propostas"}
        values={{
          leadId: lead?.id,
          companyName: lead?.companyName,
          contactName: lead?.contactName,
          contactEmail: lead?.contactEmail,
          validUntil: defaultValidUntil(today),
          monthlyFee: fee,
        }}
      />
    </>
  );
}
