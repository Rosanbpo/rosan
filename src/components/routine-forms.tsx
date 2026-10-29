"use client";

import { useState } from "react";
import {
  CATEGORY_LABEL,
  COMPETENCE_RULES,
  COMPETENCE_RULE_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  ROLE_LABEL,
  TASK_CATEGORIES,
  type Role,
} from "@/domain/enums";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";
import { ChecklistEditor, type ChecklistDraftItem } from "./ui/checklist-editor";
import { RuleFields, type RuleValues } from "./rule-fields";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

export interface TemplateValues extends RuleValues {
  name: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  estimatedMinutes: number | null;
  requiresEvidence: boolean;
  competenceRule: string;
  checklist: ChecklistDraftItem[];
}

export function TemplateForm({ action, values, submitLabel }: { action: Action; values: TemplateValues; submitLabel: string }) {
  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-sm font-semibold md:col-span-2">Modelo</h2>
        <Field label="Nome do modelo" name="name" required>
          <input id="name" name="name" required className="input" defaultValue={values.name} />
        </Field>
        <Field label="Título das tarefas geradas" name="title" required hint="A competência é acrescentada ao título quando configurada.">
          <input id="title" name="title" required className="input" defaultValue={values.title} />
        </Field>
        <Field label="Descrição / instruções" name="description" className="md:col-span-2">
          <textarea id="description" name="description" rows={4} className="input" defaultValue={values.description ?? ""} />
        </Field>
        <Field label="Categoria" name="category" required>
          <select id="category" name="category" className="input" defaultValue={values.category}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridade" name="priority" required>
          <select id="priority" name="priority" className="input" defaultValue={values.priority}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estimativa (minutos)" name="estimatedMinutes">
          <input id="estimatedMinutes" type="number" min={1} name="estimatedMinutes" className="input" defaultValue={values.estimatedMinutes ?? ""} />
        </Field>
        <Field label="Competência" name="competenceRule">
          <select id="competenceRule" name="competenceRule" className="input" defaultValue={values.competenceRule}>
            {COMPETENCE_RULES.map((c) => (
              <option key={c} value={c}>
                {COMPETENCE_RULE_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="requiresEvidence" defaultChecked={values.requiresEvidence} />
          Exigir evidência (link) para concluir
        </label>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Regra de prazo padrão</h2>
        <p className="mb-4 text-xs text-slate-500">Usada como sugestão ao vincular o modelo a um cliente; cada recorrência pode ajustar.</p>
        <RuleFields values={values} />
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Checklist</h2>
        <ChecklistEditor initial={values.checklist} />
      </section>
      <div className="flex justify-end gap-2">
        <a href="/rotinas?aba=modelos" className="btn-secondary">
          Voltar
        </a>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export interface RecurrenceFormValues extends RuleValues {
  clientId: string;
  templateId: string;
  startDate: string;
  endDate: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
}

export function RecurrenceForm({
  action,
  values,
  clients,
  templates,
  people,
  mode,
}: {
  action: Action;
  values: RecurrenceFormValues;
  clients: Array<{ id: string; tradeName: string }>;
  templates: Array<{ id: string; name: string; rule: RuleValues }>;
  people: Array<{ id: string; name: string; role: Role; clientIds: string[] | null }>;
  mode: "create" | "edit";
}) {
  const [clientId, setClientId] = useState(values.clientId);
  const [templateId, setTemplateId] = useState(values.templateId);
  const template = templates.find((t) => t.id === templateId);
  const rule = mode === "create" && template ? template.rule : values;
  const eligible = people.filter((p) => !clientId || p.clientIds === null || p.clientIds.includes(clientId));

  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Cliente" name="clientId" required>
          <select id="clientId" name="clientId" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={mode === "edit"} required>
            <option value="">Selecione…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modelo de rotina" name="templateId" required hint={mode === "create" ? "A regra de prazo do modelo é carregada como sugestão." : undefined}>
          <select id="templateId" name="templateId" className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={mode === "edit"} required>
            <option value="">Selecione…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Responsável padrão" name="assigneeId" hint="Se vazio, usa o operador responsável do cliente.">
          <select id="assigneeId" name="assigneeId" className="input" defaultValue={values.assigneeId ?? ""}>
            <option value="">Operador responsável do cliente</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Revisor padrão" name="reviewerId">
          <select id="reviewerId" name="reviewerId" className="input" defaultValue={values.reviewerId ?? ""}>
            <option value="">Sem revisão</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Início da recorrência" name="startDate" required>
          <input id="startDate" type="date" name="startDate" required className="input" defaultValue={values.startDate} />
        </Field>
        <Field label="Término (opcional)" name="endDate">
          <input id="endDate" type="date" name="endDate" className="input" defaultValue={values.endDate ?? ""} />
        </Field>
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Regra de prazo</h2>
        <RuleFields key={mode === "create" ? templateId : "edit"} values={rule} />
      </section>
      <div className="flex justify-end gap-2">
        <a href="/rotinas" className="btn-secondary">
          Voltar
        </a>
        <SubmitButton>{mode === "create" ? "Criar recorrência" : "Salvar alterações"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
