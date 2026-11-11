import Link from "next/link";
import { daysInMonth, makeLocalDate, weekday } from "@/domain/dates";

export interface CalendarTask {
  /** Dia local do prazo (AAAA-MM-DD). */
  day: string;
  status: string;
  overdue: boolean;
}

const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Calendário do mês: cada dia mostra quantas tarefas foram concluídas e quantas faltam. */
export function ProjectCalendar({
  competence,
  tasks,
  selectedDay,
  hrefFor,
}: {
  competence: string;
  tasks: CalendarTask[];
  selectedDay?: string;
  hrefFor: (day: string | null) => string;
}) {
  const [y, m] = competence.split("-").map(Number);
  const total = daysInMonth(y, m);
  const offset = (weekday(makeLocalDate(y, m, 1)) + 6) % 7; // segunda = 0
  const cells: Array<number | null> = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {WEEK.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const day = makeLocalDate(y, m, d);
          const mine = tasks.filter((t) => t.day === day);
          const done = mine.filter((t) => t.status === "CONCLUIDA").length;
          const late = mine.some((t) => t.overdue);
          const open = mine.length - done;
          const tone = !mine.length
            ? "border-slate-100 bg-slate-50 text-slate-400"
            : open === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : late
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800";
          const selected = selectedDay === day;
          return (
            <Link
              key={i}
              href={hrefFor(selected ? null : day)}
              aria-label={`Dia ${d}: ${done} de ${mine.length} concluídas`}
              aria-current={selected ? "date" : undefined}
              className={`flex min-h-14 flex-col justify-between rounded-md border p-1.5 text-left transition-shadow hover:shadow-md ${tone} ${selected ? "ring-2 ring-brand-500" : ""}`}
            >
              <span className="text-xs font-semibold">{d}</span>
              {mine.length > 0 && (
                <span className="text-[11px] tabular-nums">
                  {done}/{mine.length} {open === 0 ? "✓" : ""}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-emerald-200 bg-emerald-50" /> Tudo feito</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-amber-200 bg-amber-50" /> Falta fazer</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> Atrasado</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-slate-100 bg-slate-50" /> Sem tarefa</span>
      </p>
    </div>
  );
}
