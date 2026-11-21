"use client";

import { useEffect, useRef, useState } from "react";
import { saveLeadScriptAction } from "@/app/actions/journey";
import type { ParsedScript } from "@/domain/diagnosis-script";
import { CopyButton } from "./copy-button";

/** Roteiro da reunião de diagnóstico: marcar o que já foi falado, anotar por parte e no final. Salva sozinho. */
export function DiagnosisScript({
  leadId, script, initialChecked, initialNotes, initialFinal,
}: { leadId: string; script: ParsedScript; initialChecked: string[]; initialNotes: Record<string, string>; initialFinal: string }) {
  const [checked, setChecked] = useState<string[]>(initialChecked);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [final, setFinal] = useState(initialFinal);
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const first = useRef(true);
  const total = script.sections.reduce((n, s) => n + s.items.length, 0);
  const minutes = script.sections.reduce((n, s) => n + (s.minutes ?? 0), 0);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("saving");
    const t = setTimeout(async () => {
      try { const r = await saveLeadScriptAction(leadId, { checked, notes, finalNotes: final }); setState(r.ok ? "saved" : "error"); } catch { setState("error"); }
    }, 700);
    return () => clearTimeout(t);
  }, [checked, notes, final, leadId]);

  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const done = checked.filter((id) => script.sections.some((s) => s.items.some((i) => i.id === id))).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="card sticky top-2 z-10 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-brand-900">{done} de {total} falas e perguntas concluídas</p>
          <span className="text-xs text-slate-500">Duração máxima: {minutes} minutos</span>
          <span className={state === "error" ? "ml-auto text-xs text-red-600" : "ml-auto text-xs text-slate-400"} aria-live="polite">
            {state === "saving" ? "Salvando…" : state === "error" ? "Não foi possível salvar. Tente de novo." : "✅ Salvo"}
          </span>
          <button type="button" onClick={() => { if (confirm("Desmarcar todas as falas? As anotações são mantidas.")) setChecked([]); }} className="text-xs text-slate-400 hover:text-brand-700">Reiniciar checklist</button>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      {script.heading && <p className="text-sm text-slate-500">{script.heading}</p>}

      {script.sections.map((s) => {
        const sd = s.items.filter((i) => checked.includes(i.id)).length;
        return (
          <section key={s.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-brand-900">{s.title}</h2>
              {s.minutes != null && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⏱️ {s.minutes} min</span>}
              <span className="ml-auto text-xs text-slate-500">{sd} de {s.items.length}</span>
            </div>
            <ul className="mt-2 space-y-2">
              {s.items.map((i) => {
                const on = checked.includes(i.id);
                return (
                  <li key={i.id} className={`rounded-lg border p-3 ${on ? "border-emerald-200 bg-emerald-50/50" : "border-hair bg-white"}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={on} onChange={() => toggle(i.id)} className="mt-1 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-brand-800">{i.label}</span>
                        <span className={`block text-sm ${on ? "text-slate-500" : "text-slate-800"}`}>{i.text}</span>
                      </span>
                    </label>
                    <div className="ml-7 mt-1"><CopyButton text={i.text} label="Copiar fala" /></div>
                  </li>
                );
              })}
            </ul>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">📝 Anotações: {s.title}</span>
              <textarea value={notes[s.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))} rows={3} className="input mt-1" placeholder="O que o cliente respondeu, dores, números, objeções…" />
            </label>
          </section>
        );
      })}

      <section className="card p-4">
        <h2 className="text-base font-semibold text-brand-900">📝 Anotações finais</h2>
        <p className="mb-1 text-xs text-slate-500">Resumo da reunião, decisões, próximos passos e combinados com o cliente.</p>
        <textarea value={final} onChange={(e) => setFinal(e.target.value)} rows={6} className="input" placeholder="Principais dores, fit com a Rosan, valor combinado, próximo passo e prazo…" />
      </section>

      {script.footer && <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">💡 {script.footer}</p>}
    </div>
  );
}
