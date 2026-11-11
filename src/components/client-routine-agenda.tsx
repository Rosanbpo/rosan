import Link from "next/link";
import type { ReactNode } from "react";
import { setRecurrenceStatusAction } from "@/app/actions/routines";
import { ConfirmAction } from "./confirm-action";

export interface AgendaRoutine {
  id: string;
  name: string;
  frequency: string;
  weekdays: number[];
  monthDays: number[];
  nthBusinessDay: number | null;
  dueTime: string;
  status: string;
  assignee: string | null;
}

const DAY_LABEL: Record<number, string> = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 0: "Dom" };

function Card({ r, note, editable }: { r: AgendaRoutine; note?: string; editable: boolean }) {
  const paused = r.status !== "ACTIVE";
  return (
    <li className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${paused ? "border-amber-200 opacity-70" : "border-slate-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700 tabular-nums">{r.dueTime}</span>
        {editable &&
          (paused ? (
            <ConfirmAction action={setRecurrenceStatusAction.bind(null, r.id, "ACTIVE")} label="Reativar" className="btn-ghost btn-sm" confirm="Reativar esta rotina?" />
          ) : (
            <ConfirmAction
              action={setRecurrenceStatusAction.bind(null, r.id, "PAUSED")}
              label="Pausar"
              className="btn-ghost btn-sm text-slate-500"
              confirm="Pausar esta rotina? Ela deixa de gerar tarefas até ser reativada."
            />
          ))}
      </div>
      <div className="mt-1.5">
        {editable ? (
          <Link href={`/rotinas/recorrencias/${r.id}`} className="font-medium hover:underline">
            {r.name}
          </Link>
        ) : (
          <span className="font-medium">{r.name}</span>
        )}
        {note && <p className="text-xs text-slate-500">{note}</p>}
        {r.assignee && <p className="text-xs text-slate-400">{r.assignee}</p>}
        {paused && <p className="text-xs font-medium text-amber-700">Pausada</p>}
      </div>
    </li>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 border-b-2 border-brand-500/60 pb-1 text-xs font-semibold tracking-wide text-brand-900 uppercase">
        {title}
        <span className="rounded-full bg-brand-900 px-1.5 text-[10px] text-brand-100">{count}</span>
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>
    </section>
  );
}

const byTime = (a: AgendaRoutine, b: AgendaRoutine) => a.dueTime.localeCompare(b.dueTime) || a.name.localeCompare(b.name);

/** Agenda das rotinas do cliente: semana, todo dia útil e mensais. */
export function ClientRoutineAgenda({ routines, editable }: { routines: AgendaRoutine[]; editable: boolean }) {
  const daily = routines.filter((r) => r.frequency === "DAILY_BUSINESS").sort(byTime);
  const weekly = routines.filter((r) => r.frequency === "WEEKLY");
  const monthly = routines.filter((r) => r.frequency !== "DAILY_BUSINESS" && r.frequency !== "WEEKLY").sort(byTime);
  const days = [1, 2, 3, 4, 5, ...[6, 0].filter((d) => weekly.some((r) => r.weekdays.includes(d)))];

  if (!routines.length) return <p className="text-sm text-slate-500">Nenhuma rotina cadastrada para este cliente.</p>;

  return (
    <div className="space-y-6">
      {weekly.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-brand-900 uppercase">Dias da semana</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {days.map((d) => {
              const items = weekly.filter((r) => r.weekdays.includes(d)).sort(byTime);
              return (
                <div key={d}>
                  <p className="mb-2 flex items-center gap-2 border-b-2 border-brand-500/60 pb-1 text-xs font-semibold text-brand-900 uppercase">
                    {DAY_LABEL[d]}
                    <span className="rounded-full bg-brand-900 px-1.5 text-[10px] text-brand-100">{items.length}</span>
                  </p>
                  <ul className="space-y-2">
                    {items.map((r) => (
                      <Card key={r.id} r={r} editable={editable} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {daily.length > 0 && (
        <Group title="Todo dia útil" count={daily.length}>
          {daily.map((r) => (
            <Card key={r.id} r={r} editable={editable} />
          ))}
        </Group>
      )}
      {monthly.length > 0 && (
        <Group title="Mensal" count={monthly.length}>
          {monthly.map((r) => (
            <Card
              key={r.id}
              r={r}
              editable={editable}
              note={
                r.frequency === "MONTHLY_NTH_BUSINESS_DAY"
                  ? `${r.nthBusinessDay}º dia útil`
                  : r.frequency === "BIWEEKLY"
                    ? `Dias ${[...r.monthDays].sort((a, b) => a - b).join(" e ")}`
                    : `Todo dia ${r.monthDays[0]}`
              }
            />
          ))}
        </Group>
      )}
    </div>
  );
}
