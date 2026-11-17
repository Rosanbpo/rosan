import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
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
        <Field label={ata ? "Ata" : "Detalhes"} name="content" required className="md:col-span-2" hint="Mesmo formato dos POPs: seções, listas, checklist, avisos e tabelas.">
          <PopEditor name="content" title={values.title ?? ""} defaultValue={values.content ?? (ata ? ATA_TEMPLATE : "")} />
        </Field>
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
