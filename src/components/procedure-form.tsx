import Link from "next/link";
import {
  CATEGORY_LABEL,
  PROCEDURE_STATUSES,
  PROCEDURE_STATUS_LABEL,
  ROLE_LABEL,
  TASK_CATEGORIES,
  type Role,
} from "@/domain/enums";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface ProcedureFormValues {
  title?: string;
  category?: string;
  status?: string;
  objective?: string | null;
  content?: string;
  tools?: string | null;
  responsible?: string | null;
  ownerId?: string | null;
  reviewedAt?: string | null;
}

export function ProcedureForm({
  action,
  people,
  values = {},
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  people: Array<{ id: string; name: string; role: Role }>;
  values?: ProcedureFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Título do processo" name="title" required className="md:col-span-2">
          <input id="title" name="title" required className="input" defaultValue={values.title} placeholder="Ex.: Conciliação bancária diária" />
        </Field>
        <Field label="Área" name="category" required>
          <select id="category" name="category" className="input" defaultValue={values.category ?? "OUTRAS"}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Situação" name="status" required hint="Operadores só enxergam POPs publicados.">
          <select id="status" name="status" className="input" defaultValue={values.status ?? "RASCUNHO"}>
            {PROCEDURE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROCEDURE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Objetivo" name="objective" className="md:col-span-2">
          <input id="objective" name="objective" className="input" defaultValue={values.objective ?? ""} placeholder="Para que serve este processo?" />
        </Field>
        <Field label="Passo a passo" name="content" required className="md:col-span-2" hint="Um passo por linha. Use linhas em branco para separar etapas.">
          <textarea id="content" name="content" required rows={14} className="input font-mono" defaultValue={values.content ?? ""} />
        </Field>
        <Field label="Sistemas e ferramentas" name="tools">
          <input id="tools" name="tools" className="input" defaultValue={values.tools ?? ""} placeholder="Banco, ERP, planilha…" />
        </Field>
        <Field label="Quem executa" name="responsible">
          <input id="responsible" name="responsible" className="input" defaultValue={values.responsible ?? ""} placeholder="Operador do cliente" />
        </Field>
        <Field label="Responsável pelo POP" name="ownerId">
          <select id="ownerId" name="ownerId" className="input" defaultValue={values.ownerId ?? ""}>
            <option value="">—</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Última revisão" name="reviewedAt">
          <input id="reviewedAt" type="date" name="reviewedAt" className="input" defaultValue={values.reviewedAt ?? ""} />
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
