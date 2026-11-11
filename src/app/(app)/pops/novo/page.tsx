import { PageHeader } from "@/components/ui/layout";
import { ProcedureForm } from "@/components/procedure-form";
import { createProcedureAction } from "@/app/actions/procedures";
import { requirePermission } from "@/server/context";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo POP" };

export default async function NewProcedurePage() {
  const actor = await requirePermission("procedures.manage");
  const people = await assignableUsers(actor);
  return (
    <>
      <PageHeader title="Novo POP" breadcrumb={{ href: "/pops", label: "Processos e POPs" }} />
      <ProcedureForm action={createProcedureAction} people={people} submitLabel="Criar POP" cancelHref="/pops" />
    </>
  );
}
