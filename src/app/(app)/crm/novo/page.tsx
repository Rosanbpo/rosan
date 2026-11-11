import { PageHeader } from "@/components/ui/layout";
import { LeadForm } from "@/components/lead-form";
import { createLeadAction } from "@/app/actions/crm";
import { requirePermission } from "@/server/context";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo lead" };

export default async function NewLeadPage() {
  const actor = await requirePermission("crm.manage");
  const people = await assignableUsers(actor);
  return (
    <>
      <PageHeader title="Novo lead" breadcrumb={{ href: "/crm", label: "CRM comercial" }} />
      <LeadForm action={createLeadAction} people={people} submitLabel="Cadastrar lead" cancelHref="/crm" />
    </>
  );
}
