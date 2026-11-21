"use client";

import { useRef, useState } from "react";

/** Etapas do diagnóstico, 2 seções por página, com "Próximo" que confere as respostas da página antes de avançar. */
export function DiagnosisWizard({ pages, titles }: { pages: React.ReactNode[]; titles: string[] }) {
  const [step, setStep] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const last = step === pages.length - 1;

  const next = () => {
    const fields = refs.current[step]?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? [];
    for (const f of Array.from(fields)) if (!f.reportValidity()) return;
    // perguntas de marcar várias opções: pelo menos uma por pergunta
    const boxes = Array.from(refs.current[step]?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? []);
    const names = Array.from(new Set(boxes.map((b) => b.name).filter((n) => !n.endsWith("Other"))));
    for (const n of names) {
      const group = boxes.filter((b) => b.name === n);
      if (!group.some((b) => b.checked)) {
        const first = group[0];
        first.setCustomValidity("Marque pelo menos uma opção.");
        first.addEventListener("change", () => group.forEach((b) => b.setCustomValidity("")), { once: true });
        first.reportValidity();
        return;
      }
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-5" aria-label={`Etapa ${step + 1} de ${pages.length}`}>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>Parte {step + 1} de {pages.length} · {titles[step]}</span>
          <span>{Math.round(((step + 1) / pages.length) * 100)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={pages.length}>
          <div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${((step + 1) / pages.length) * 100}%` }} />
        </div>
      </div>
      {pages.map((p, i) => (
        <div key={i} ref={(el) => { refs.current[i] = el; }} hidden={i !== step}>
          {p}
        </div>
      ))}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={back} className="btn-secondary px-5 py-2.5 text-base">← Voltar</button>
        )}
        {last ? (
          <button type="submit" className="btn-primary px-6 py-2.5 text-base">Enviar diagnóstico</button>
        ) : (
          <button type="button" onClick={next} className="btn-primary px-6 py-2.5 text-base">Próximo →</button>
        )}
        <p className="text-xs text-slate-500">🔒 Não pedimos senhas, logins nem dados de cartão.</p>
      </div>
    </div>
  );
}
