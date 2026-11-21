import type { ReactNode } from "react";
import { CATEGORY_LABEL, PRIORITY_LABEL, STAGE_LABEL, type JourneyStage, type Priority, type TaskCategory } from "@/domain/enums";
import type { Esteira } from "@/domain/esteiras";
import { cx, STAGE_TONE, TONE } from "@/lib/ui";
import { EsteiraIcon } from "./esteira-icon";

export const toneOf = (stage: JourneyStage) => TONE[STAGE_TONE[stage] as keyof typeof TONE];

export interface MapItem { slug: string; name: string; stage: JourneyStage; days: number; tasks: number; done?: number }

/** Mapa da jornada: as fases na ordem em que acontecem, com link para cada uma. */
export function JourneyMap({ items, showProgress }: { items: MapItem[]; showProgress?: boolean }) {
  return (
    <nav aria-label="Mapa da jornada" className="card p-4">
      <p className="mb-3 text-sm font-semibold text-brand-900">🗺️ Mapa da jornada: da venda ao encerramento</p>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const tone = toneOf(it.stage);
          return (
            <li key={it.slug}>
              <a href={`#${it.slug}`} className={cx("flex items-center gap-3 rounded-xl border p-2.5 transition hover:shadow-sm", tone.border, tone.soft)}>
                <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", tone.solid)}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm font-semibold", tone.text)}>{it.name}</span>
                  <span className="block text-xs text-slate-500">
                    {showProgress && it.done != null ? `${it.done} de ${it.tasks} concluídas` : `${it.tasks} tarefas`} · até o dia {it.days}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Cabeçalho de uma fase da jornada. */
export function PhaseHeader({
  stage, number, name, summary, icon, days, tasks, extra, children,
}: { stage: JourneyStage; number: number; name: string; summary: string; icon: Esteira["icon"]; days: number; tasks: number; extra?: ReactNode; children?: ReactNode }) {
  const tone = toneOf(stage);
  return (
    <header className={cx("rounded-t-2xl bg-gradient-to-r px-5 py-4 text-white", tone.band)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"><EsteiraIcon icon={icon} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/80">Fase {number} · {STAGE_LABEL[stage]}</p>
          <h2 className="text-xl font-semibold leading-tight">{name}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/20 px-2.5 py-1">⏱️ até o dia {days}</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1">{tasks} tarefas</span>
          {extra}
        </div>
      </div>
      <p className="mt-2 text-sm text-white/90">{summary}</p>
      {children}
    </header>
  );
}

/** Título de uma etapa dentro da fase, com a faixa de dias. */
export function StageTitle({ index, name, from, to, tone, right }: { index: number; name: string; from: number; to: number; tone: (typeof TONE)[keyof typeof TONE]; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cx("flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white", tone.solid)}>{index}</span>
      <h3 className="text-base font-semibold text-slate-900">{name}</h3>
      <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", tone.chip)}>{from === to ? `dia ${from}` : `dia ${from} a ${to}`}</span>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

export interface TaskCardProps {
  day: number;
  dateLabel?: string;
  title: string;
  category: string;
  minutes: number;
  priority?: string | null;
  description?: string | null;
  checklist: string[];
  tone: (typeof TONE)[keyof typeof TONE];
  status?: { label: string; tone: "done" | "doing" | "off" | "none"; href?: string };
  done?: boolean;
  children?: ReactNode;
}

const STATUS_CLS = { done: "bg-emerald-600 text-white", doing: "bg-sky-100 text-sky-800", off: "bg-slate-200 text-slate-600", none: "bg-slate-100 text-slate-500" };

/** Uma tarefa da jornada: prazo à esquerda, título, o que fazer, checklist e os textos padrão logo abaixo. */
export function TaskCard({ day, dateLabel, title, category, minutes, priority, description, checklist, tone, status, done, children }: TaskCardProps) {
  return (
    <li className="relative flex gap-3">
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className={cx("flex h-12 w-12 flex-col items-center justify-center rounded-xl text-white", done ? "bg-emerald-600" : tone.solid)}>
          <span className="text-[10px] font-medium leading-none opacity-90">dia</span>
          <span className="text-lg font-bold leading-none">{day}</span>
        </span>
        {dateLabel && <span className="mt-1 text-[11px] font-medium text-slate-500">{dateLabel}</span>}
        <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden />
      </div>
      <div className={cx("mb-4 min-w-0 flex-1 rounded-xl border bg-white shadow-sm", done ? "border-emerald-200" : "border-hair")}>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <h4 className={cx("flex-1 text-[15px] font-semibold", done ? "text-slate-400 line-through" : "text-slate-900")}>{done ? "✅ " : ""}{title}</h4>
          {status && (status.href
            ? <a href={status.href} className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium hover:underline", STATUS_CLS[status.tone])}>{status.label} →</a>
            : <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CLS[status.tone])}>{status.label}</span>)}
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pt-1.5 text-xs">
          <span className={cx("rounded-full px-2 py-0.5 font-medium", tone.chip)}>{CATEGORY_LABEL[category as TaskCategory] ?? category}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">⏱️ {minutes} min</span>
          {priority && priority !== "NORMAL" && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">{PRIORITY_LABEL[priority as Priority] ?? priority}</span>}
        </div>
        {description && <p className="px-4 pt-2 text-sm text-slate-600">{description}</p>}
        {checklist.length > 0 && (
          <div className="px-4 pt-3">
            <p className="mb-1 text-xs font-semibold text-slate-700">☑️ Checklist ({checklist.length})</p>
            <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {checklist.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-transparent">✓</span>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="px-4 pb-3 pt-3">{children}</div>
      </div>
    </li>
  );
}

/** Faixa que agrupa as mensagens, e-mails e documentos de uma tarefa. */
export function StandardsBox({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
      <p className="mb-1.5 text-xs font-semibold text-brand-900">📎 Mensagens, e-mails e documentos padrão{count ? ` (${count})` : ""}</p>
      {count === 0 && <p className="text-xs text-slate-400">Nenhum padrão ligado a esta tarefa ainda.</p>}
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}
