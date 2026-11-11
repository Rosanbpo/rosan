"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { TOKEN_HELP, type Clause } from "@/domain/contract";

const BLOCK_LABEL = { services: "Quadro de serviços e mensalidade", fee: "Quadro da mensalidade", volumes: "Quadro de limites mensais", values: "Quadro de valores do distrato" } as const;

/** Editor das cláusulas; envia o resultado como JSON no campo oculto `name`. */
export function ClauseEditor({ name, initial, defaults }: { name: string; initial: Clause[]; defaults: Clause[] }) {
  const [clauses, setClauses] = useState<Clause[]>(initial);
  const set = (i: number, patch: Partial<Clause>) => setClauses((all) => all.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) =>
    setClauses((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(clauses)} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Edite o texto livremente. Marcadores como{" "}
          {Object.entries(TOKEN_HELP).map(([k, v], i) => (
            <span key={k}>
              {i > 0 && ", "}
              <code className="rounded bg-slate-100 px-1" title={v}>
                {k}
              </code>
            </span>
          ))}{" "}
          são preenchidos com os dados do formulário. As cláusulas são numeradas automaticamente.
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => window.confirm("Restaurar o texto padrão descarta todas as suas edições nas cláusulas. Continuar?") && setClauses(defaults)}
        >
          <RotateCcw aria-hidden className="h-4 w-4" /> Restaurar texto padrão
        </button>
      </div>

      <ol className="space-y-3">
        {clauses.map((c, i) => (
          <li key={i} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">CLÁUSULA {i + 1}ª</p>
              <div className="flex gap-1">
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Subir cláusula" onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Descer cláusula" onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Remover cláusula" onClick={() => window.confirm("Remover esta cláusula?") && setClauses((all) => all.filter((_, k) => k !== i))}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="text-xs">
                Capítulo (opcional — inicia um novo capítulo)
                <input className="input mt-1" value={c.section ?? ""} onChange={(e) => set(i, { section: e.target.value })} placeholder="Ex.: IV — DOS VALORES E REAJUSTE" />
              </label>
              <label className="text-xs">
                Título da cláusula
                <input className="input mt-1" value={c.title} onChange={(e) => set(i, { title: e.target.value })} />
              </label>
            </div>
            <label className="mt-2 block text-xs">
              Texto <span className="text-slate-400">(linha em branco separa parágrafos; linhas com “- ” viram lista)</span>
              <textarea className="input mt-1 text-sm" rows={Math.min(12, Math.max(3, c.text.split("\n").length + 1))} value={c.text} onChange={(e) => set(i, { text: e.target.value })} />
            </label>
            {c.footnote !== undefined && c.footnote !== null && (
              <label className="mt-2 block text-xs">
                Texto depois do quadro
                <textarea className="input mt-1 text-sm" rows={2} value={c.footnote} onChange={(e) => set(i, { footnote: e.target.value })} />
              </label>
            )}
            {c.block && <p className="mt-1 text-xs text-brand-700">Após o texto aparece: {BLOCK_LABEL[c.block]}.</p>}
          </li>
        ))}
      </ol>
      <button type="button" className="btn-secondary mt-3" onClick={() => setClauses((all) => [...all, { title: "Nova cláusula", text: "Texto da cláusula." }])}>
        <Plus aria-hidden className="h-4 w-4" /> Adicionar cláusula
      </button>
    </div>
  );
}
