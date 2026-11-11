"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CATEGORY_LABEL, ROLE_LABEL, type Role } from "@/domain/enums";
import type { Esteira } from "@/domain/esteiras";
import type { ActionState } from "@/lib/action-state";
import { cx, TONE } from "@/lib/ui";
import { ActionForm, Field, SubmitButton } from "./ui/action-form";

export function EsteiraApplyForm({
  esteira,
  action,
  clients,
  people,
  clientId,
  today,
}: {
  esteira: Pick<Esteira, "slug" | "tone" | "stages">;
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  clients: Array<{ id: string; tradeName: string }>;
  people: Array<{ id: string; name: string; role: Role }>;
  clientId?: string;
  today: string;
}) {
  const tone = TONE[esteira.tone];
  const allKeys = esteira.stages.flatMap((s, si) => s.tasks.map((_, ti) => `${si}.${ti}`));
  const [checked, setChecked] = useState<Set<string>>(new Set(allKeys));
  const toggle = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  return (
    <ActionForm action={action} className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <input type="hidden" name="slug" value={esteira.slug} />
      {[...checked].map((k) => (
        <input key={k} type="hidden" name="keys" value={k} />
      ))}

      <div className="space-y-5">
        {esteira.stages.map((stage, si) => {
          const keys = stage.tasks.map((_, ti) => `${si}.${ti}`);
          const all = keys.every((k) => checked.has(k));
          return (
            <section key={stage.name} className={cx("overflow-hidden rounded-xl border bg-white shadow-sm", tone.border)}>
              <header className={cx("flex items-center justify-between gap-3 px-4 py-3", tone.soft)}>
                <div className="flex items-center gap-3">
                  <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white", tone.solid)}>{si + 1}</span>
                  <h2 className={cx("text-sm font-semibold", tone.text)}>{stage.name}</h2>
                  <span className="text-xs text-slate-500">{stage.tasks.length} tarefas</span>
                </div>
                <button type="button" className={cx("text-xs font-medium hover:underline", tone.text)} onClick={() => toggle(keys, !all)}>
                  {all ? "Desmarcar etapa" : "Marcar etapa"}
                </button>
              </header>
              <ul className="divide-y divide-slate-100">
                {stage.tasks.map((task, ti) => {
                  const key = `${si}.${ti}`;
                  return (
                    <li key={task.title} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`t-${key}`}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          checked={checked.has(key)}
                          onChange={(e) => toggle([key], e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`t-${key}`} className="cursor-pointer text-sm font-medium text-slate-900">
                            {task.title}
                          </label>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className={cx("rounded-full px-2 py-0.5 font-medium", tone.chip)}>{CATEGORY_LABEL[task.category]}</span>
                            <span>dia {task.day}</span>
                            <span>~{task.minutes} min</span>
                            {task.priority === "ALTA" && <span className="font-medium text-orange-700">prioridade alta</span>}
                          </div>
                          <details className="group mt-1.5 text-xs text-slate-600">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-slate-500 hover:text-slate-800">
                              <ChevronDown aria-hidden className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                              {task.items.length} itens do checklist
                            </summary>
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                              {task.items.map((i) => (
                                <li key={i}>{i}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className={cx("space-y-4 rounded-xl border bg-white p-4 shadow-sm lg:sticky lg:top-4", tone.border)}>
        <h2 className="text-sm font-semibold text-brand-900">Aplicar a um cliente</h2>
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
        <Field label="Data de início" name="startDate" required>
          <input id="startDate" type="date" name="startDate" required className="input" defaultValue={today} />
        </Field>
        <Field label="Responsável" name="ownerId">
          <select id="ownerId" name="ownerId" className="input" defaultValue="">
            <option value="">Sem responsável</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABEL[p.role]})
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="createProject" defaultChecked className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>Criar um projeto para acompanhar o andamento</span>
        </label>
        <p className="text-xs text-slate-500">Tarefas já aplicadas a este cliente não são duplicadas. Os prazos caem em dias úteis.</p>
        <SubmitButton>Aplicar {checked.size} de {allKeys.length} tarefas</SubmitButton>
      </aside>
    </ActionForm>
  );
}
