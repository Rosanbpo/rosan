import { createClientNoteAction } from "@/app/actions/client-notes";
import { ClientNoteForm } from "@/components/client-note-form";
import { PageHeader } from "@/components/ui/layout";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getClient } from "@/server/services/clients";

export const metadata = { title: "Novo registro do cliente" };

export default async function NewClientNotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const { tipo } = await searchParams;
  const client = await orNotFound(getClient(actor, id));
  const kind = tipo === "ata" ? "ATA" : "PARTICULARIDADE";
  const aba = kind === "ATA" ? "atas" : "particularidades";
  return (
    <>
      <PageHeader
        title={kind === "ATA" ? "Nova ata de reunião" : "Nova observação"}
        description={client.tradeName}
        breadcrumb={{ href: `/clientes/${id}?aba=${aba}`, label: "Voltar ao cliente" }}
      />
      <ClientNoteForm action={createClientNoteAction.bind(null, id)} kind={kind} submitLabel="Salvar" cancelHref={`/clientes/${id}?aba=${aba}`} />
    </>
  );
}
