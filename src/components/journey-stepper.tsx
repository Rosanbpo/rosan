import Link from "next/link";
import { JOURNEY_STAGES, STAGE_LABEL, type JourneyStage } from "@/domain/enums";

const SHORT: Record<JourneyStage, string> = { COMERCIAL: "💼", PRE_ONBOARDING: "📥", ONBOARDING: "🚀", IMPLANTACAO: "⚙️", OPERACIONAL: "🔁", ESTRATEGICO: "💡", ACOMPANHAMENTO: "💙", ENCERRAMENTO: "🚪" };

/** Linha da jornada do cliente: etapas já passadas, a atual em destaque e as próximas. */
export function JourneyStepper({ current, clientId }: { current: JourneyStage | null; clientId: string }) {
  const idx = current ? JOURNEY_STAGES.indexOf(current) : -1;
  return (
    <section className="mb-6 rounded-xl border border-hair bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-900">🧭 Jornada do cliente</h2>
        <Link href={`/clientes/${clientId}?aba=jornada`} className="text-xs text-brand-700 hover:underline">Ver a jornada →</Link>
      </div>
      {idx < 0 ? (
        <p className="text-sm text-slate-500">Etapa ainda não definida. <Link href={`/clientes/${clientId}/editar`} className="text-brand-700 hover:underline">Definir etapa</Link></p>
      ) : (
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {JOURNEY_STAGES.map((st, i) => {
            const state = i < idx ? "done" : i === idx ? "now" : "next";
            return (
              <li key={st} aria-current={state === "now" ? "step" : undefined} className={`rounded-lg border px-2 py-2 text-center text-[11px] leading-tight ${state === "now" ? "border-brand-700 bg-brand-700 font-semibold text-white" : state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-hair bg-slate-50 text-slate-400"}`}>
                <span className="block text-base">{state === "done" ? "✓" : SHORT[st]}</span>
                {STAGE_LABEL[st]}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
