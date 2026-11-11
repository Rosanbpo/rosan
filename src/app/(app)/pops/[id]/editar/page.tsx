import { PageHeader } from "@/components/ui/layout";
import { ProcedureForm } from "@/components/procedure-form";
import { updateProcedureAction } from "@/app/actions/procedures";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProcedure } from "@/server/services/procedures";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Editar POP" };

export default async function EditProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("procedures.manage");
  const { id } = await params;
  const [proc, people] = await Promise.all([orNotFound(getProcedure(actor, id)), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title={`Editar ${proc.title}`} breadcrumb={{ href: `/pops/${id}`, label: "Voltar ao POP" }} />
      <ProcedureForm
        action={updateProcedureAction.bind(null, id)}
        people={people}
        submitLabel="Salvar alterações"
        cancelHref={`/pops/${id}`}
        values={{ ...proc, reviewedAt: proc.reviewedAtLocal }}
      />
    </>
  );
}
