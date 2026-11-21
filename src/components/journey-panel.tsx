import Link from "next/link";
import { applyJourneyStageAction } from "@/app/actions/journey";
import { STAGE_LABEL, type JourneyStage } from "@/domain/enums";
import { cx, STAGE_TONE, TONE } from "@/lib/ui";
import type { JourneyView } from "@/server/services/journey";
import { JourneyAssets } from "./journey-assets";

const STATUS_LABEL: Record<string, string> = {
  A_FAZER: "A fazer", EM_ANDAMENTO: "Em andamento", AGUARDANDO_CLIENTE: "Aguardando cliente", AGUARDANDO_TERCEIRO: "Aguardando terceiro",
  EM_REVISAO: "Em revisão", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
};
const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Jornada com prazos, tarefas geradas e os textos padrão de cada tarefa. Usada no cliente e no lead. */
export function JourneyPanel({
  view, target, back, today, people, vars, canGenerate,
}: {
  view: JourneyView[];
  target: { clientId?: string; leadId?: string };
  back: string;
  today: string;
  people: Array<{ id: string; name: string }>;
  vars: Record<string, string>;
  canGenerate: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        🧭 Cada etapa mostra as tarefas com o <b>prazo calculado a partir da data de início</b> que você escolher. Abra uma tarefa para ver a mensagem, o e-mail e o documento padrão e copiar sem sair daqui. Use <b>Gerar tarefas desta etapa</b> para criar tudo com checklist e prazo.
      </p>
      {view.map((j) => {
        const tone = TONE[STAGE_TONE[j.stage as JourneyStage] as keyof typeof TONE];
        return (
          <section key={j.esteira.slug} className={cx("rounded-2xl border bg-white", tone.border)}>
            <header className={cx("rounded-t-2xl px-4 py-2.5", tone.soft)}>
              <h2 className={cx("text-base font-semibold", tone.text)}>{STAGE_LABEL[j.stage as JourneyStage]}: {j.esteira.name}</h2>
              <p className="text-xs text-slate-500">{j.esteira.summary}</p>
            </header>
            <div className="space-y-3 p-4">
              {j.stages.map((s) => (
                <details key={s.stageIdx} open={s.generatedCount < s.tasks.length} className="rounded-xl border border-hair">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2">
                    <span className="font-medium text-brand-900">{s.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.generatedCount} de {s.tasks.length} tarefas geradas</span>
                  </summary>
                  <div className="space-y-3 border-t border-hair p-3">
                    {canGenerate && s.generatedCount < s.tasks.length && (
                      <form action={applyJourneyStageAction} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2.5">
                        <input type="hidden" name="slug" value={s.slug} />
                        <input type="hidden" name="stageIdx" value={s.stageIdx} />
                        <input type="hidden" name="clientId" value={target.clientId ?? ""} />
                        <input type="hidden" name="leadId" value={target.leadId ?? ""} />
                        <input type="hidden" name="back" value={back} />
                        <label className="text-xs"><span className="font-medium text-slate-600">Início</span><input type="date" name="startDate" defaultValue={today} required className="input mt-0.5" /></label>
                        <label className="text-xs"><span className="font-medium text-slate-600">Responsável</span>
                          <select name="ownerId" className="input mt-0.5"><option value="">Sem responsável</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        </label>
                        <button type="submit" className="btn-primary btn-sm">⚡ Gerar tarefas desta etapa</button>
                      </form>
                    )}
                    <ul className="space-y-3">
                      {s.tasks.map((t) => (
                        <li key={t.key} className="text-sm">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="w-20 shrink-0 text-xs font-semibold text-amber-800">⏱️ dia {t.day} · {fmt(t.dueDate)}</span>
                            <span className="flex-1 font-medium text-slate-800">{t.title}</span>
                            <span className="text-xs text-slate-400">{t.minutes} min · {t.items} itens</span>
                            {t.generated ? (
                              <Link href={`/tarefas/${t.generated.id}`} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:underline">
                                {STATUS_LABEL[t.generated.status] ?? t.generated.status} →
                              </Link>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">não gerada</span>
                            )}
                          </div>
                          <div className="ml-20 pl-2"><JourneyAssets assets={t.assets} vars={vars} /></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
