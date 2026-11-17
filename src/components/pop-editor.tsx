"use client";

import { useRef, useState } from "react";
import { PopDocument } from "./pop-document";
import { PopMindMap } from "./pop-mindmap";

const SNIPPETS: Array<{ label: string; text: string }> = [
  { label: "Título", text: "\n## Título da seção\n" },
  { label: "Subtítulo", text: "\n### Subtítulo\n" },
  { label: "Passo", text: "\n1. Nome do passo\n   Explicação do que fazer.\n" },
  { label: "Lista", text: "\n- Tópico\n- Outro tópico\n" },
  { label: "Checklist", text: "\n- [ ] Item\n- [ ] Outro item\n" },
  { label: "Aviso", text: "\n> [aviso] Atenção: texto do aviso.\n" },
  { label: "Regra", text: "\n> [regra] Regra: texto da regra.\n" },
  { label: "Dica", text: "\n> [dica] Dica: texto da dica.\n" },
  { label: "Tabela", text: "\n| Situação | Ação |\n|---|---|\n| Exemplo | O que fazer |\n" },
  { label: "Divisor", text: "\n---\n" },
];

type Tab = "editar" | "documento" | "mapa";

/** Editor de POP com botões de blocos (estilo Notion) e prévias do documento e do mapa mental. */
export function PopEditor({ name, defaultValue, title }: { name: string; defaultValue: string; title: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<Tab>("editar");
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(text: string) {
    const el = ref.current;
    const pos = el ? el.selectionStart : value.length;
    const next = value.slice(0, pos) + text + value.slice(pos);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + text.length, pos + text.length);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Modo de edição">
        {(["editar", "documento", "mapa"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? "rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white" : "rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"}
          >
            {t === "editar" ? "Escrever" : t === "documento" ? "Prévia do documento" : "Prévia do mapa mental"}
          </button>
        ))}
      </div>
      {/* o campo fica sempre no formulário, mesmo escondido, para ser enviado */}
      <div className={tab === "editar" ? "space-y-2" : "hidden"}>
        <div className="flex flex-wrap gap-1.5">
          {SNIPPETS.map((s) => (
            <button key={s.label} type="button" onClick={() => insert(s.text)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
              + {s.label}
            </button>
          ))}
        </div>
        <textarea
          ref={ref}
          id={name}
          name={name}
          required
          rows={22}
          className="input font-mono text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={"## Objetivo\nPara que serve este processo.\n\n## Passo a passo\n1. Primeiro passo\n2. Segundo passo"}
        />
        <p className="text-xs text-slate-500">
          Use <code>##</code> para seções, <code>1.</code> para passos, <code>- [ ]</code> para checklist, <code>&gt; [aviso]</code> para destaques e <code>|</code> para tabelas. O mapa mental é montado sozinho a partir das seções e dos itens.
        </p>
      </div>
      {tab === "documento" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <PopDocument content={value} />
        </div>
      )}
      {tab === "mapa" && <PopMindMap title={(typeof document !== "undefined" && (document.getElementById("title") as HTMLInputElement | null)?.value) || title || "Processo"} content={value} />}
    </div>
  );
}
