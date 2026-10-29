import { PageHeader } from "@/components/ui/layout";
import { ClientForm } from "@/components/client-form";
import { updateClientAction } from "@/app/actions/clients";
import { dbDateToLocalDate } from "@/domain/dates";
import { requirePermission } from "@/server/context";
import { getClient } from "@/server/services/clients";
import { assignableUsers } from "@/server/services/tasks";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Editar cliente" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("clients.manage");
  const { id } = await params;
  const [client, people] = await Promise.all([orNotFound(getClient(actor, id)), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title={`Editar ${client.tradeName}`} breadcrumb={{ href: `/clientes/${id}`, label: client.tradeName }} />
      <ClientForm
        action={updateClientAction.bind(null, id)}
        people={people}
        submitLabel="Salvar alterações"
        cancelHref={`/clientes/${id}`}
        values={{
          ...client,
          startDate: client.startDate ? dbDateToLocalDate(client.startDate) : null,
          memberIds: client.members.map((m) => m.userId),
        }}
      />
    </>
  );
}
