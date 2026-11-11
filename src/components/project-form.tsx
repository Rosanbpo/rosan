import Link from "next/link";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, ROLE_LABEL, type Role } from "@/domain/enums";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export interface ProjectFormValues {
  name?: string;
  description?: string | null;
  clientId?: string | null;
  status?: string;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId?: string | null;
}

export function ProjectForm({
  action,
  clients,
  people,
  values = {},
  submitLabel,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  clients: Array<{ id: string; tradeName: string }>;
  people: Array<{ id: string; name: string; role: Role }>;
  values?: ProjectFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Nome do projeto" name="name" required className="md:col-span-2">
          <input id="name" name="name" required className="input" defaultValue={values.name} placeholder="Ex.: Implantação do cliente X" />
        </Field>
        <Field label="Cliente" name="clientId" hint="Deixe em branco para projetos internos da Rosan.">
          <select id="clientId" name="clientId" className="input" defaultValue={values.clientId ?? ""}>
            <option value="">Projeto interno</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Situação" name="status" required>
          <select id="status" name="status" className="input" defaultValue={values.status ?? "PLANEJADO"}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Início" name="startDate">
          <input id="startDate" type="date" name="startDate" className="input" defaultValue={values.startDate ?? ""} />
        </Field>
        <Field label="Prazo final" name="dueDate">
          <input id="dueDate" type="date" name="dueDate" className="input" defaultValue={values.dueDate ?? ""} />
        </Field>
        <Field label="Responsável" name="ownerId">
          <select id="ownerId" name="ownerId" className="input" defaultValue={values.ownerId ?? ""}>
            <option value="">—</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descrição e objetivos" name="description" className="md:col-span-2">
          <textarea id="description" name="description" rows={4} className="input" defaultValue={values.description ?? ""} />
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
