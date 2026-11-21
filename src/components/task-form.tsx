"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITIES, ROLE_LABEL, TASK_CATEGORIES, type Role } from "@/domain/enums";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";
import { ChecklistEditor, type ChecklistDraftItem } from "./ui/checklist-editor";

export interface TaskPrefill {
  id: string;
  name: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  checklist: ChecklistDraftItem[];
}

export interface Person {
  id: string;
  name: string;
  role: Role;
  clientIds: string[] | null;
}

export interface TaskFormValues {
  clientId?: string;
  title?: string;
  description?: string | null;
  category?: string;
  priority?: string;
  assigneeId?: string | null;
  reviewerId?: string | null;
  competence?: string | null;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedMinutes?: number | null;
  requiresEvidence?: boolean;
  projectId?: string | null;
}

export function TaskForm({
  action,
  clients,
  people,
  projects = [],
  prefills = [],
  values = {},
  mode,
  canPlan,
  selfId,
  cancelHref,
  modal = false,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  clients: Array<{ id: string; tradeName: string }>;
  people: Person[];
  projects?: Array<{ id: string; name: string; clientId: string | null }>;
  prefills?: TaskPrefill[];
  values?: TaskFormValues;
  mode: "create" | "edit";
  canPlan: boolean;
  selfId: string;
  cancelHref: string;
  modal?: boolean;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(values.clientId ?? "");
  const eligible = people.filter((p) => !clientId || clientId === "interna" || p.clientIds === null || p.clientIds.includes(clientId));
  const lockPlanning = !canPlan;
  const [fill, setFill] = useState<{ n: number; p: TaskPrefill | null }>({ n: 0, p: null });
  const pick = (id: string) => setFill((f) => ({ n: f.n + 1, p: prefills.find((t) => t.id === id) ?? null }));

  return (
    <ActionForm action={action} className={modal ? "space-y-4 [&_.card]:rounded-xl [&_.card]:border-slate-100 [&_.card]:shadow-none" : "space-y-6"}>
      <div className="card grid gap-4 p-5 md:grid-cols-2" key={fill.n}>
        {mode === "create" && prefills.length > 0 && (
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 md:col-span-2">
            <label htmlFor="prefill" className="text-xs font-semibold uppercase tracking-wide text-brand-800">⚡ Puxar de um modelo pronto (opcional)</label>
            <select id="prefill" className="input mt-1.5" value={fill.p?.id ?? ""} onChange={(e) => pick(e.target.value)}>
              <option value="">— Começar do zero —</option>
              {prefills.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-600">Preenche título, categoria, prioridade e checklist. Você ajusta o que precisar.</p>
          </div>
        )}
        {mode === "create" ? (
          <Field label="Cliente" name="clientId" required>
            <select id="clientId" name="clientId" required className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="" disabled>
                Selecione…
              </option>
              <option value="interna">Tarefa interna (sem cliente)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div>
            <span className="label">Cliente</span>
            <p className="py-2 text-sm">{clients.find((c) => c.id === clientId)?.tradeName ?? "Tarefa interna (sem cliente)"}</p>
          </div>
        )}
        <Field label="Categoria" name="category" required>
          <select id="category" name="category" className="input" defaultValue={fill.p?.category ?? values.category ?? "OUTRAS"} disabled={lockPlanning && mode === "edit"}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          {lockPlanning && mode === "edit" && <input type="hidden" name="category" value={values.category} />}
        </Field>
        <Field label="Projeto (opcional)" name="projectId" hint="Vincule a tarefa a uma implantação ou iniciativa.">
          <select id="projectId" name="projectId" className="input" defaultValue={values.projectId ?? ""} disabled={lockPlanning && mode === "edit"}>
            <option value="">Sem projeto</option>
            {projects
              .filter((p) => !clientId || p.clientId === null || p.clientId === clientId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          {lockPlanning && mode === "edit" && <input type="hidden" name="projectId" value={values.projectId ?? ""} />}
        </Field>
        <Field label="Título" name="title" required className="md:col-span-2">
          <input id="title" name="title" required minLength={2} maxLength={200} className="input" defaultValue={fill.p?.title ?? values.title} />
        </Field>
        <Field label="Descrição" name="description" className="md:col-span-2">
          <textarea id="description" name="description" rows={4} className="input" defaultValue={fill.p?.description ?? values.description ?? ""} />
        </Field>
      </div>

      {mode === "create" && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Checklist <span className="font-normal text-slate-500">(opcional — passos que precisam ser feitos)</span></h2>
          <ChecklistEditor key={fill.n} initial={fill.p?.checklist ?? []} allowRequired={canPlan} />
        </div>
      )}

      <div className="card grid gap-4 p-5 md:grid-cols-3">
        <h2 className="text-sm font-semibold text-slate-900 md:col-span-3">Responsabilidades e prazo</h2>
        <Field label="Responsável pela execução" name="assigneeId" hint={lockPlanning ? "Operadores criam tarefas para si mesmos." : undefined}>
          <select id="assigneeId" name="assigneeId" className="input" defaultValue={values.assigneeId ?? selfId} disabled={lockPlanning}>
            <option value="">Sem responsável</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
          {lockPlanning && <input type="hidden" name="assigneeId" value={values.assigneeId ?? selfId} />}
        </Field>
        <Field label="Revisor (opcional)" name="reviewerId" hint="Com revisor, a tarefa passa por revisão antes de concluir.">
          <select id="reviewerId" name="reviewerId" className="input" defaultValue={values.reviewerId ?? ""} disabled={lockPlanning && mode === "edit"}>
            <option value="">Sem revisão</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
          {lockPlanning && mode === "edit" && <input type="hidden" name="reviewerId" value={values.reviewerId ?? ""} />}
        </Field>
        <Field label="Prioridade" name="priority">
          <select id="priority" name="priority" className="input" defaultValue={values.priority ?? "NORMAL"} disabled={lockPlanning && mode === "edit"}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          {lockPlanning && mode === "edit" && <input type="hidden" name="priority" value={values.priority} />}
        </Field>
        <Field label="Prazo — data" name="dueDate" required>
          <input id="dueDate" type="date" name="dueDate" required className="input" defaultValue={values.dueDate} readOnly={lockPlanning && mode === "edit"} />
        </Field>
        <Field label="Prazo — horário" name="dueTime" required hint="Horário de Brasília">
          <input id="dueTime" type="time" name="dueTime" required className="input" defaultValue={values.dueTime ?? "18:00"} readOnly={lockPlanning && mode === "edit"} />
        </Field>
        <Field label="Competência" name="competence" hint="Mês de referência, quando aplicável">
          <input id="competence" type="month" name="competence" className="input" defaultValue={values.competence ?? ""} />
        </Field>
        <Field label="Início — data" name="startDate">
          <input id="startDate" type="date" name="startDate" className="input" defaultValue={values.startDate} readOnly={lockPlanning && mode === "edit"} />
        </Field>
        <Field label="Início — horário" name="startTime">
          <input id="startTime" type="time" name="startTime" className="input" defaultValue={values.startTime ?? "08:00"} readOnly={lockPlanning && mode === "edit"} />
        </Field>
        <Field label="Estimativa (minutos)" name="estimatedMinutes">
          <input id="estimatedMinutes" type="number" min={1} name="estimatedMinutes" className="input" defaultValue={values.estimatedMinutes ?? ""} />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox" name="requiresEvidence" defaultChecked={values.requiresEvidence} disabled={lockPlanning && mode === "edit"} />
          Exigir evidência (link) para concluir
          {lockPlanning && mode === "edit" && values.requiresEvidence && <input type="hidden" name="requiresEvidence" value="on" />}
        </label>
      </div>


      <div className={modal ? "sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4" : "flex justify-end gap-2"}>
        {modal ? (
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        ) : (
          <a href={cancelHref} className="btn-secondary">
            Cancelar
          </a>
        )}
        <SubmitButton>{mode === "create" ? "Criar tarefa" : "Salvar alterações"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
