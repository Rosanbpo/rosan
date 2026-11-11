import { IMPLANTATION_STEPS } from "@/domain/implantation";
import { ROLE_LABEL, type Role } from "@/domain/enums";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export function ImplantationForm({
  action,
  clients,
  people,
  clientId,
  today,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  clients: Array<{ id: string; tradeName: string }>;
  people: Array<{ id: string; name: string; role: Role }>;
  clientId?: string;
  today: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Cliente" name="clientId" required>
          <select id="clientId" name="clientId" required className="input" defaultValue={clientId ?? ""}>
            <option value="">Selecione…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Início da implantação" name="startDate" required>
          <input id="startDate" type="date" name="startDate" required className="input" defaultValue={today} />
        </Field>
        <Field label="Responsável" name="ownerId" hint="Recebe todas as tarefas; redistribua depois se precisar.">
          <select id="ownerId" name="ownerId" className="input" defaultValue="">
            <option value="">Sem responsável</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer text-brand-700">Ver as {IMPLANTATION_STEPS.length} tarefas que serão criadas</summary>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5">
          {IMPLANTATION_STEPS.map((s) => (
            <li key={s.title}>
              {s.title} <span className="text-xs text-slate-400">(dia {s.offsetDays})</span>
            </li>
          ))}
        </ol>
      </details>
      <div className="flex justify-end">
        <SubmitButton>Criar projeto de implantação</SubmitButton>
      </div>
    </ActionForm>
  );
}
