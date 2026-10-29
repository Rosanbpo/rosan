"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export interface ChecklistDraftItem {
  label: string;
  required: boolean;
}

/** Editor de checklist para formulários: serializa os itens em um campo oculto JSON. */
export function ChecklistEditor({
  name = "checklist",
  initial = [],
  allowRequired = true,
}: {
  name?: string;
  initial?: ChecklistDraftItem[];
  allowRequired?: boolean;
}) {
  const [items, setItems] = useState<ChecklistDraftItem[]>(initial);
  const [draft, setDraft] = useState("");

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    setItems((prev) => [...prev, { label, required: false }]);
    setDraft("");
  };
  const move = (index: number, delta: number) =>
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.length > 0 ? (
        <ul className="mb-2 divide-y divide-slate-100 rounded-md border border-slate-200">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{item.label}</span>
              {allowRequired && (
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(e) =>
                      setItems((prev) => prev.map((p, j) => (j === i ? { ...p, required: e.target.checked } : p)))
                    }
                  />
                  Obrigatório
                </label>
              )}
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label={`Mover "${item.label}" para cima`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label={`Mover "${item.label}" para baixo`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remover "${item.label}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-500">Nenhum item. Adicione os passos que precisam ser conferidos.</p>
      )}
      <div className="flex gap-2">
        <input
          className="input"
          value={draft}
          placeholder="Novo item do checklist"
          aria-label="Novo item do checklist"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={add}>
          <Plus aria-hidden className="h-4 w-4" /> Adicionar
        </button>
      </div>
    </div>
  );
}
