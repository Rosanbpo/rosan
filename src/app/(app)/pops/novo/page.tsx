import { PageHeader } from "@/components/ui/layout";
import { ProcedureForm } from "@/components/procedure-form";
import { createProcedureAction } from "@/app/actions/procedures";
import { requirePermission } from "@/server/context";
import { getClient } from "@/server/services/clients";
import { orNotFound } from "@/server/page-utils";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo POP" };

export default async function NewProcedurePage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const actor = await requirePermission("procedures.manage");
  const { cliente } = await searchParams;
  const [people, client] = await Promise.all([assignableUsers(actor), cliente ? orNotFound(getClient(actor, cliente)) : Promise.resolve(null)]);
  const back = client ? `/clientes/${client.id}?aba=pops` : "/pops";
  return (
    <>
      <PageHeader
        title={client ? `Novo POP de ${client.tradeName}` : "Novo POP"}
        breadcrumb={{ href: back, label: client ? "Voltar ao cliente" : "Processos e POPs" }}
      />
      <ProcedureForm action={createProcedureAction} people={people} submitLabel="Criar POP" cancelHref={back} clientId={client?.id} />
    </>
  );
}
