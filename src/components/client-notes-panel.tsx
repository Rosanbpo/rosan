import Link from "next/link";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { deleteClientNoteAction } from "@/app/actions/client-notes";
import { NOTE_TONE, toneOf } from "@/domain/client-note-tone";
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
  tone?: string | null;
  pinned?: boolean;
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
  if (!ata) return <ObservationBoard clientId={clientId} rows={rows} canDelete={canDelete} />;
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

/** Particularidades como quadro de observações coloridas, com as fixadas no topo. */
function ObservationBoard({ clientId, rows, canDelete }: { clientId: string; rows: ClientNoteRow[]; canDelete: boolean }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">O que a equipe precisa saber ao atender este cliente: combinados, preferências, cuidados e o que nunca fazer.</p>
        <Link href={`/clientes/${clientId}/notas/nova?tipo=particularidade`} className="btn-primary">
          <Plus aria-hidden className="h-4 w-4" /> Nova observação
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma observação ainda" description="Anote combinados, preferências e cuidados. As importantes podem ser fixadas e aparecem no resumo do cliente." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((n) => {
            const t = NOTE_TONE[toneOf(n.tone)];
            return (
              <li key={n.id} className={`relative overflow-hidden rounded-xl border p-5 pl-6 shadow-sm ${t.card}`}>
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} />
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.chip}`}>{t.emoji} {t.label}</span>
                  {n.pinned && <span className="text-xs font-medium text-slate-600">📌 Fixada</span>}
                </div>
                <h3 className="text-lg font-semibold leading-snug text-slate-900">{n.title}</h3>
                <div className="mt-2 text-[15px]"><PopDocument content={n.content} /></div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/clientes/${clientId}/notas/${n.id}/editar`} className="btn-secondary btn-sm"><Pencil aria-hidden className="h-3.5 w-3.5" /> Editar</Link>
                  {canDelete && <ConfirmAction action={deleteClientNoteAction.bind(null, clientId, n.id)} label="Remover" className="btn-ghost btn-sm" confirm="Remover esta observação?" />}
                  <span className="ml-auto text-xs text-slate-500">{n.author?.name ? `${n.author.name} · ` : ""}{fmtDate(n.updatedAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
