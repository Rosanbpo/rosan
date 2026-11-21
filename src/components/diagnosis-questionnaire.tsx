import { DiagnosisWizard } from "./diagnosis-wizard";
import { DIAGNOSIS_SECTIONS, type Answers, type Question } from "@/domain/diagnosis-form";

const lbl = "text-sm font-medium text-slate-800";
const hintCls = "mt-1 block text-xs text-slate-500";

function Control({ q, v, other, required }: { q: Question; v: string | string[] | undefined; other: string | undefined; required: boolean }) {
  const val = typeof v === "string" ? v : "";
  const pill = "flex cursor-pointer items-center gap-2 rounded-lg border border-[#d3dae5] bg-white px-3 py-2 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900";
  switch (q.type) {
    case "textarea":
      return <textarea name={q.key} rows={3} required={required} defaultValue={val} maxLength={2000} className="input mt-1.5" />;
    case "number":
      return <input name={q.key} type="number" inputMode="numeric" min={0} max={999999999} step={1} required={required} defaultValue={val} className="input mt-1.5 max-w-44" />;
    case "money":
      return <input name={q.key} inputMode="decimal" required={required} defaultValue={val} placeholder="0,00" className="input mt-1.5 max-w-56" />;
    case "yesno":
    case "radio": {
      const opts = q.type === "yesno" ? ["Sim", "Não"] : q.options!;
      return (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {opts.map((o) => (
            <label key={o} className={pill}>
              <input type="radio" name={q.key} value={o} required={required} defaultChecked={val === o} />
              {o}
            </label>
          ))}
          {q.other && <input name={`${q.key}Other`} defaultValue={other ?? ""} maxLength={200} placeholder="Se for outro, qual?" aria-label={`${q.label} (outro)`} className="input max-w-64" />}
        </div>
      );
    }
    case "checks":
      return (
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {q.options!.map((o) => (
            <label key={o} className={pill}>
              <input type="checkbox" name={q.key} value={o} defaultChecked={Array.isArray(v) && v.includes(o)} />
              {o}
            </label>
          ))}
        </div>
      );
    default:
      return <input name={q.key} type={q.type === "email" ? "email" : q.type === "tel" ? "tel" : "text"} required={required} defaultValue={val} maxLength={300} autoComplete={q.key === "contactName" ? "name" : q.key === "contactEmail" ? "email" : q.key === "contactPhone" ? "tel" : "off"} className="input mt-1.5" />;
  }
}

/** Questionário do diagnóstico. `required` = link público (tudo obrigatório); sem ele, lançamento manual. */
export function DiagnosisQuestionnaire({ answers, required, paged = false }: { answers: Answers; required: boolean; paged?: boolean }) {
  const sections = DIAGNOSIS_SECTIONS.map((s, i) => (
        <section key={s.id} className="rounded-2xl border border-hair bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white" aria-hidden>{i + 1}</span>
            <div>
              <h2 className="text-base font-semibold text-brand-900">{s.emoji} {s.title}</h2>
              <p className="text-sm text-slate-500">{s.intro}</p>
            </div>
          </header>
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            {s.questions.map((q) => {
              const group = q.type === "radio" || q.type === "yesno" || q.type === "checks";
              const ctl = <Control q={q} v={answers[q.key]} other={typeof answers[`${q.key}Other`] === "string" ? (answers[`${q.key}Other`] as string) : undefined} required={required && q.type !== "checks"} />;
              const wide = q.type === "textarea" || q.type === "checks" || q.type === "radio" || q.type === "yesno" ? "md:col-span-2" : "";
              return (
                <div key={q.key} className={wide}>
                  {group ? (
                    <fieldset>
                      <legend className={lbl}><span>{q.label}{required && <span className="text-red-600" aria-hidden> *</span>}</span></legend>
                      {ctl}
                      {q.hint && <span className={hintCls}>{q.hint}</span>}
                    </fieldset>
                  ) : (
                    <label className="block">
                      <span className={lbl}>{q.label}{required && <span className="text-red-600" aria-hidden> *</span>}</span>
                      {ctl}
                      {q.hint && <span className={hintCls}>{q.hint}</span>}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>
  ));
  if (!paged) return <div className="space-y-5">{sections}</div>;
  const pages: React.ReactNode[] = [];
  const titles: string[] = [];
  for (let i = 0; i < sections.length; i += 2) {
    pages.push(<div className="space-y-5">{sections.slice(i, i + 2)}</div>);
    titles.push(DIAGNOSIS_SECTIONS.slice(i, i + 2).map((s) => s.title).join(" e "));
  }
  return <DiagnosisWizard pages={pages} titles={titles} />;
}
