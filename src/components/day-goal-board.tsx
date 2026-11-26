import Link from "next/link";
import { addDayGoalFormAction, removeDayGoalFormAction } from "@/app/actions/day-goal";
import { FinishMini, TimerMini } from "@/components/task-timer";
import type { dayGoal } from "@/server/services/day-goal";

type Goal = Awaited<ReturnType<typeof dayGoal>>;

/** Meta do dia: as tarefas que, cumpridas, deixam o dia vencido. */
export function DayGoalBoard({ goal }: { goal: Goal }) {
  const total = goal.items.length;
  const won = total > 0 && goal.done === total;
  const pct = total ? Math.round((goal.done / total) * 100) : 0;
  return (
    <section aria-label="Meta do dia" className={`mb-4 rounded-2xl border p-4 ${won ? "border-emerald-300 bg-emerald-50" : "border-gold/60 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-brand-900">{won ? "Meta do dia cumprida. Dia vencido!" : "Meta do dia"}</h2>
          <p className="text-xs text-slate-500">
            {total ? `${goal.done} de ${total} tarefas da meta. Cumpriu essas, o dia está ganho, mesmo que sobre o resto.` : "Escolha as tarefas que não podem ficar para amanhã. Cumprindo elas, o dia está ganho."}
          </p>
        </div>
        {total > 0 && <span className={`text-2xl font-semibold tabular-nums ${won ? "text-emerald-700" : "text-brand-900"}`}>{pct}%</span>}
      </div>
      {total > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${won ? "bg-emerald-500" : "bg-gold"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {total > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {goal.items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{t.done ? "✓" : ""}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/tarefas/${t.id}`} className={`block truncate text-sm font-medium hover:underline ${t.done ? "text-slate-400 line-through" : "text-brand-900"}`}>{t.title}</Link>
                {t.client && <p className="truncate text-xs text-slate-500">{t.client}</p>}
              </div>
              {!t.done && <TimerMini taskId={t.id} runningSince={null} />}
              {!t.done && <FinishMini taskId={t.id} />}
              {!t.done && (
                <form action={removeDayGoalFormAction}>
                  <input type="hidden" name="taskId" value={t.id} />
                  <button className="text-xs text-slate-500 hover:text-red-700" aria-label={`Tirar ${t.title} da meta`}>Tirar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {goal.candidates.length > 0 && (
        <form action={addDayGoalFormAction} className="mt-3 flex flex-wrap items-center gap-2">
          <select name="taskId" className="input min-w-0 flex-1 text-sm" aria-label="Tarefa para a meta do dia" defaultValue="">
            <option value="" disabled>Adicionar tarefa à meta…</option>
            {goal.candidates.map((c) => <option key={c.id} value={c.id}>{c.title}{c.client ? ` · ${c.client}` : ""}</option>)}
          </select>
          <button className="btn-primary btn-sm">Adicionar</button>
        </form>
      )}
    </section>
  );
}
