import { notFound } from "next/navigation";
import { updateClientNoteAction } from "@/app/actions/client-notes";
import { ClientNoteForm } from "@/components/client-note-form";
import { PageHeader } from "@/components/ui/layout";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getClientNote } from "@/server/services/client-notes";

export const metadata = { title: "Editar registro do cliente" };

export default async function EditClientNotePage({ params }: { params: Promise<{ id: string; noteId: string }> }) {
  const actor = await requireActor();
  const { id, noteId } = await params;
  const note = await orNotFound(getClientNote(actor, noteId));
  if (note.clientId !== id) notFound();
  const aba = note.kind === "ATA" ? "atas" : "particularidades";
  return (
    <>
      <PageHeader title={`Editar: ${note.title}`} breadcrumb={{ href: `/clientes/${id}?aba=${aba}`, label: "Voltar ao cliente" }} />
      <ClientNoteForm
        action={updateClientNoteAction.bind(null, noteId)}
        kind={note.kind}
        values={{ title: note.title, content: note.content, meetingDate: note.meetingDateLocal, participants: note.participants, tone: note.tone, pinned: note.pinned }}
        submitLabel="Salvar alterações"
        cancelHref={`/clientes/${id}?aba=${aba}`}
      />
    </>
  );
}
