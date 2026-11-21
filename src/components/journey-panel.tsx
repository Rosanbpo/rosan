import { applyJourneyStageAction } from "@/app/actions/journey";
import { type JourneyStage } from "@/domain/enums";
import { cx } from "@/lib/ui";
import type { JourneyView } from "@/server/services/journey";
import { JourneyAssets } from "./journey-assets";
import { JourneyMap, PhaseHeader, StageTitle, StandardsBox, TaskCard, toneOf } from "./journey-ui";

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
  const doneOf = (j: JourneyView) => j.stages.reduce((n, s) => n + s.tasks.filter((t) => t.generated?.status === "CONCLUIDA").length, 0);
  const totalOf = (j: JourneyView) => j.stages.reduce((n, s) => n + s.tasks.length, 0);
  const daysOf = (j: JourneyView) => Math.max(0, ...j.stages.flatMap((s) => s.tasks.map((t) => t.day)));
  return (
    <div className="space-y-5">
      <JourneyMap showProgress items={view.map((j) => ({ slug: j.esteira.slug, name: j.esteira.name, stage: j.stage as JourneyStage, days: daysOf(j), tasks: totalOf(j), done: doneOf(j) }))} />
      <p className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-900">
        🧭 Cada fase tem etapas, e cada etapa tem tarefas com <b>prazo calculado a partir da data de início</b> que você escolher. Em cada tarefa estão o checklist e a mensagem, o e-mail e o documento padrão, para copiar sem sair daqui. Clique em <b>Gerar tarefas desta etapa</b> para criar tudo no sistema. Quando uma tarefa é concluída, ela aparece concluída aqui.
      </p>
      {view.map((j, n) => {
        const tone = toneOf(j.stage as JourneyStage);
        const done = doneOf(j);
        const total = totalOf(j);
        return (
          <section key={j.esteira.slug} id={j.esteira.slug} className={cx("scroll-mt-4 rounded-2xl border bg-white shadow-sm", tone.border)}>
            <PhaseHeader
              stage={j.stage as JourneyStage} number={n + 1} name={j.esteira.name} summary={j.esteira.summary} icon={j.esteira.icon}
              days={daysOf(j)} tasks={total}
              extra={done > 0 || j.stages.some((s) => s.generatedCount > 0) ? <span className="rounded-full bg-white px-2.5 py-1 text-emerald-700">✅ {done} de {total} concluídas</span> : null}
            />
            <div className="space-y-6 p-5">
              {j.stages.map((s) => {
                const from = s.tasks.length ? Math.min(...s.tasks.map((t) => t.day)) : 0;
                const to = s.tasks.length ? Math.max(...s.tasks.map((t) => t.day)) : 0;
                const sdone = s.tasks.filter((t) => t.generated?.status === "CONCLUIDA").length;
                return (
                  <div key={s.stageIdx}>
                    <StageTitle
                      index={s.stageIdx + 1} name={s.name} from={from} to={to} tone={tone}
                      right={<span className="text-xs text-slate-500">{s.generatedCount} de {s.tasks.length} geradas{s.generatedCount > 0 ? ` · ${sdone} concluídas` : ""}</span>}
                    />
                    {canGenerate && s.generatedCount < s.tasks.length && (
                      <form action={applyJourneyStageAction} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2.5">
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
                    <ol className="mt-4">
                      {s.tasks.map((t) => {
                        const g = t.generated;
                        const isDone = g?.status === "CONCLUIDA";
                        return (
                          <TaskCard
                            key={t.key} day={t.day} dateLabel={fmt(t.dueDate)} title={t.title} category={t.category} minutes={t.minutes}
                            priority={t.priority} description={t.description} checklist={t.checklist} tone={tone} done={isDone}
                            status={g ? { label: STATUS_LABEL[g.status] ?? g.status, tone: isDone ? "done" : g.status === "CANCELADA" ? "off" : "doing", href: `/tarefas/${g.id}` } : { label: "não gerada", tone: "none" }}
                          >
                            <StandardsBox count={t.assets.length}><JourneyAssets assets={t.assets} vars={vars} /></StandardsBox>
                          </TaskCard>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
