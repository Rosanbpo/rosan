import { PageHeader } from "@/components/ui/layout";
import { LeadForm } from "@/components/lead-form";
import { updateLeadAction } from "@/app/actions/crm";
import { dbDateToLocalDate } from "@/domain/dates";
import { moneyInput } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getLead } from "@/server/services/leads";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Editar lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const [lead, people] = await Promise.all([orNotFound(getLead(actor, id)), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title={`Editar ${lead.companyName}`} breadcrumb={{ href: `/crm/${id}`, label: "Voltar ao lead" }} />
      <LeadForm
        action={updateLeadAction.bind(null, id)}
        people={people}
        submitLabel="Salvar alterações"
        cancelHref={`/crm/${id}`}
        values={{
          ...lead,
          expectedFee: moneyInput(lead.expectedFee === null ? null : Number(lead.expectedFee)),
          nextActionAt: lead.nextActionAt ? dbDateToLocalDate(lead.nextActionAt) : null,
        }}
      />
    </>
  );
}
