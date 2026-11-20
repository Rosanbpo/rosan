import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { NOTE_TONE, NOTE_TONES } from "@/domain/client-note-tone";
import { PopEditor } from "./pop-editor";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export const ATA_TEMPLATE = `## Pauta
- Assunto 1
- Assunto 2

## Decisões
- 

## Próximos passos
- [ ] Ação — responsável — prazo
`;

export interface ClientNoteValues {
  title?: string;
  content?: string;
  meetingDate?: string | null;
  participants?: string | null;
  tone?: string | null;
  pinned?: boolean;
}

export function ClientNoteForm({
  action,
  kind,
  values = {},
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  kind: "PARTICULARIDADE" | "ATA";
  values?: ClientNoteValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const ata = kind === "ATA";
  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="kind" value={kind} />
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label={ata ? "Assunto da reunião" : "Título"} name="title" required className="md:col-span-2">
          <input id="title" name="title" required className="input" defaultValue={values.title} placeholder={ata ? "Ex.: Reunião mensal de resultados" : "Ex.: Só aprova pagamentos às quintas"} />
        </Field>
        {ata && (
          <>
            <Field label="Data da reunião" name="meetingDate" required>
              <input id="meetingDate" type="date" name="meetingDate" required className="input" defaultValue={values.meetingDate ?? ""} />
            </Field>
            <Field label="Participantes" name="participants">
              <input id="participants" name="participants" className="input" defaultValue={values.participants ?? ""} placeholder="Nomes separados por vírgula" />
            </Field>
          </>
        )}
        {!ata && (
          <fieldset className="md:col-span-2">
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Tipo de destaque</legend>
            <div className="flex flex-wrap gap-2">
              {NOTE_TONES.map((t) => (
                <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:ring-2 has-[:checked]:ring-brand-700 ${NOTE_TONE[t].card}`}>
                  <input type="radio" name="tone" value={t} defaultChecked={(values.tone ?? "INFO") === t} className="sr-only" />
                  <span aria-hidden>{NOTE_TONE[t].emoji}</span> {NOTE_TONE[t].label}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="pinned" defaultChecked={values.pinned} /> 📌 Fixar no topo e no resumo do cliente</label>
          </fieldset>
        )}
        {ata ? (
          <Field label="Ata" name="content" required className="md:col-span-2" hint="Mesmo formato dos POPs: seções, listas, checklist, avisos e tabelas.">
            <PopEditor name="content" title={values.title ?? ""} defaultValue={values.content ?? ATA_TEMPLATE} />
          </Field>
        ) : (
          <Field label="Observação" name="content" required className="md:col-span-2" hint="Escreva em linhas curtas. Use **negrito** para destacar o mais importante e “- ” para fazer listas.">
            <textarea id="content" name="content" required rows={6} className="input" defaultValue={values.content ?? ""} placeholder="Ex.: A dona só aprova pagamentos às quintas-feiras. Nunca incluir pagamentos na segunda." />
          </Field>
        )}
      </section>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </ActionForm>
  );
}
