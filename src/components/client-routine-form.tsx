"use client";

import { useState } from "react";
import { CATEGORY_LABEL, TASK_CATEGORIES } from "@/domain/enums";
import { quickAddRoutineAction } from "@/app/actions/routines";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

const DAYS = [
  { n: 1, label: "Seg" },
  { n: 2, label: "Ter" },
  { n: 3, label: "Qua" },
  { n: 4, label: "Qui" },
  { n: 5, label: "Sex" },
];

export function ClientRoutineForm({
  clientId,
  templates,
  people,
}: {
  clientId: string;
  templates: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string }>;
}) {
  const [mode, setMode] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [template, setTemplate] = useState("");
  return (
    <ActionForm action={quickAddRoutineAction.bind(null, clientId)} resetOnSuccess onSuccess={() => setTemplate("")} className="grid gap-4 md:grid-cols-2">
      <Field label="Modelo correspondente (opcional)" name="templateId" hint="Sem modelo, a rotina cria um modelo novo automaticamente." className="md:col-span-2">
        <select id="templateId" name="templateId" className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="">Nenhum, criar modelo novo automaticamente</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      {!template && (
        <>
          <Field label="Título" name="title" required className="md:col-span-2">
            <input id="title" name="title" required maxLength={150} className="input" placeholder="Ex.: Conciliação bancária, Enviar contas a pagar…" />
          </Field>
          <Field label="Categoria" name="category">
            <select id="category" name="category" className="input" defaultValue="OUTRAS">
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <Field label="Responsável" name="assigneeId" hint="Em branco: o responsável do cliente.">
        <select id="assigneeId" name="assigneeId" className="input" defaultValue="">
          <option value="">Responsável do cliente</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Recorrência" name="mode" required>
        <select id="mode" name="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="DAILY">Todo dia útil</option>
          <option value="WEEKLY">Dias da semana</option>
          <option value="MONTHLY">Mensal (dia do mês)</option>
        </select>
      </Field>
      <Field label="Horário" name="dueTime" required>
        <input id="dueTime" type="time" name="dueTime" required defaultValue="10:00" className="input" />
      </Field>
      {mode === "WEEKLY" && (
        <fieldset className="md:col-span-2">
          <legend className="label">Dias da semana</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {DAYS.map((d) => (
              <label key={d.n} className="flex items-center gap-1.5">
                <input type="checkbox" name="weekdays" value={d.n} /> {d.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {mode === "MONTHLY" && (
        <Field label="Dia do mês" name="monthDay" required hint="Se cair em fim de semana ou feriado, passa para o próximo dia útil.">
          <input id="monthDay" type="number" name="monthDay" min={1} max={31} required defaultValue={10} className="input" />
        </Field>
      )}
      {!template && (
        <Field label="Observação" name="description" className="md:col-span-2">
          <textarea id="description" name="description" rows={2} className="input" placeholder="Detalhe opcional…" />
        </Field>
      )}
      <div className="flex justify-end md:col-span-2">
        <SubmitButton>Adicionar rotina</SubmitButton>
      </div>
    </ActionForm>
  );
}
