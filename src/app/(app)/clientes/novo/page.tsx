import { PageHeader } from "@/components/ui/layout";
import { ClientForm } from "@/components/client-form";
import { createClientAction } from "@/app/actions/clients";
import { requirePermission } from "@/server/context";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo cliente" };

export default async function NewClientPage() {
  const actor = await requirePermission("clients.manage");
  const people = await assignableUsers(actor);
  return (
    <>
      <PageHeader title="Novo cliente" breadcrumb={{ href: "/clientes", label: "Clientes" }} />
      <ClientForm action={createClientAction} people={people} submitLabel="Cadastrar cliente" cancelHref="/clientes" />
    </>
  );
}
