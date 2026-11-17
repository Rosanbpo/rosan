import Link from "next/link";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { deleteClientNoteAction } from "@/app/actions/client-notes";
import { fmtDate, fmtLocalDate } from "@/lib/format";
import { ConfirmAction } from "./confirm-action";
import { PopDocument } from "./pop-document";
import { EmptyState } from "./ui/layout";

export interface ClientNoteRow {
  id: string;
  title: string;
  content: string;
  meetingDateLocal: string | null;
  participants: string | null;
  updatedAt: Date;
  author: { name: string } | null;
}

/** Lista de particularidades ou atas de um cliente. Cada item abre como documento. */
export function ClientNotesPanel({
  clientId,
  kind,
  rows,
  canDelete,
}: {
  clientId: string;
  kind: "PARTICULARIDADE" | "ATA";
  rows: ClientNoteRow[];
  canDelete: boolean;
}) {
  const ata = kind === "ATA";
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {ata ? "Registro das reuniões com o cliente: pauta, decisões e próximos passos." : "O que é diferente neste cliente: combinados, preferências, exceções e cuidados."}
        </p>
        <Link href={`/clientes/${clientId}/notas/nova?tipo=${ata ? "ata" : "particularidade"}`} className="btn-primary">
          <Plus aria-hidden className="h-4 w-4" /> {ata ? "Nova ata" : "Nova particularidade"}
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={ata ? "Nenhuma ata registrada" : "Nenhuma particularidade registrada"} description={ata ? "Registre a primeira reunião com este cliente." : "Anote o que a equipe precisa saber para atender este cliente."} />
      ) : (
        <ul className="space-y-3">
          {rows.map((n, i) => (
            <li key={n.id} className="card">
              <details open={i === 0}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-medium text-slate-900">{n.title}</span>
                  {ata && n.meetingDateLocal && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays aria-hidden className="h-3.5 w-3.5" /> {fmtLocalDate(n.meetingDateLocal)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {n.author?.name ? `${n.author.name} · ` : ""}atualizado em {fmtDate(n.updatedAt)}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                  {n.participants && (
                    <p className="text-xs text-slate-500">
                      <strong className="font-semibold">Participantes:</strong> {n.participants}
                    </p>
                  )}
                  <PopDocument content={n.content} />
                  <div className="flex gap-2">
                    <Link href={`/clientes/${clientId}/notas/${n.id}/editar`} className="btn-secondary">
                      <Pencil aria-hidden className="h-4 w-4" /> Editar
                    </Link>
                    {canDelete && (
                      <ConfirmAction action={deleteClientNoteAction.bind(null, clientId, n.id)} label="Remover" confirm="Remover este registro? Não dá para desfazer." />
                    )}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
