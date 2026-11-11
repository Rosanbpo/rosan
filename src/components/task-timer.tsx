"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pause, Play, Timer } from "lucide-react";
import { finishTaskAction, pauseTimerAction, startTimerAction } from "@/app/actions/timer";
import type { ActionState } from "@/lib/action-state";
import { cx } from "@/lib/ui";

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Segundos decorridos desde `startedAt`, atualizados a cada segundo. */
export function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, (now - new Date(startedAt).getTime()) / 1000) : 0;
}

type Props = {
  taskId: string;
  /** Início do cronômetro em andamento nesta tarefa (ISO) ou null. */
  runningSince: string | null;
  /** Tempo já registrado na tarefa, em segundos. */
  trackedSeconds: number;
  /** Cronômetro em andamento em OUTRA tarefa (será pausado ao iniciar este). */
  otherRunning?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  canFinish?: boolean;
  finishLabel?: string;
};

function useServerAction(action: () => Promise<ActionState>) {
  const router = useRouter();
  const [state, run, pending] = useActionState(async (_: ActionState) => action(), null as ActionState);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.at, state?.ok, router]);
  return { state, run, pending };
}

/** Cronômetro completo (página da tarefa). */
export function TaskTimer({ taskId, runningSince, trackedSeconds, otherRunning, disabled, disabledReason, canFinish = true, finishLabel = "Concluir" }: Props) {
  const elapsed = useElapsed(runningSince);
  const start = useServerAction(() => startTimerAction(taskId, null));
  const pause = useServerAction(() => pauseTimerAction(taskId, null));
  const finish = useServerAction(() => finishTaskAction(taskId, null));
  const busy = start.pending || pause.pending || finish.pending;
  const running = runningSince !== null;
  const error = start.state?.error ?? pause.state?.error ?? finish.state?.error;

  return (
    <section aria-label="Cronômetro da tarefa" className="card overflow-hidden">
      <div className={cx("flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between", running && "bg-brand-900 text-brand-100")}>
        <div className="flex items-center gap-4">
          <span className={cx("flex h-12 w-12 items-center justify-center rounded-full", running ? "bg-white/10 text-brand-200" : "bg-brand-50 text-brand-700")}>
            <Timer aria-hidden className={cx("h-6 w-6", running && "animate-pulse")} />
          </span>
          <div>
            <p className={cx("text-xs font-semibold tracking-widest uppercase", running ? "text-brand-500" : "text-slate-500")}>
              {running ? "Cronômetro em andamento" : "Tempo na tarefa"}
            </p>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums" aria-live="off">
              {formatClock(trackedSeconds + elapsed)}
            </p>
            {running && <p className="text-xs text-brand-200">Esta sessão: {formatClock(elapsed)}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!running ? (
            <form action={start.run}>
              <button type="submit" disabled={disabled || busy} title={disabledReason} className="btn-primary">
                {start.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />} Iniciar
              </button>
            </form>
          ) : (
            <form action={pause.run}>
              <button type="submit" disabled={busy} className="btn-secondary !border-brand-500 !bg-white/10 !text-brand-100 hover:!bg-white/20">
                {pause.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Pause aria-hidden className="h-4 w-4" />} Pausar
              </button>
            </form>
          )}
          {canFinish && (
            <form action={finish.run}>
              <button type="submit" disabled={busy} className={running ? "btn-primary !bg-brand-500 hover:!bg-brand-600" : "btn-secondary"}>
                {finish.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden className="h-4 w-4" />} {finishLabel}
              </button>
            </form>
          )}
        </div>
      </div>
      {(error || (!running && otherRunning && !disabled) || (disabled && disabledReason)) && (
        <div className="border-t border-slate-100 px-5 py-2 text-xs">
          {error ? (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          ) : disabled && disabledReason ? (
            <p className="text-slate-500">{disabledReason}</p>
          ) : (
            <p className="text-slate-500">Você já tem um cronômetro rodando em outra tarefa; ao iniciar este, o outro será pausado e o tempo registrado.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Versão compacta para listas: relógio + iniciar/pausar. */
export function TimerMini({ taskId, runningSince, disabled }: { taskId: string; runningSince: string | null; disabled?: boolean }) {
  const elapsed = useElapsed(runningSince);
  const start = useServerAction(() => startTimerAction(taskId, null));
  const pause = useServerAction(() => pauseTimerAction(taskId, null));
  const running = runningSince !== null;
  const busy = start.pending || pause.pending;
  const error = start.state?.error ?? pause.state?.error;
  return (
    <div className="flex items-center gap-2">
      <form action={running ? pause.run : start.run}>
        <button
          type="submit"
          disabled={disabled || busy}
          aria-label={running ? "Pausar cronômetro" : "Iniciar cronômetro"}
          title={error ?? (running ? "Pausar" : "Iniciar")}
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
            running ? "border-brand-900 bg-brand-900 text-brand-200 hover:bg-brand-700" : "border-slate-300 bg-white text-brand-700 hover:bg-brand-50",
          )}
        >
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : running ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
        </button>
      </form>
      {running && <span className="font-mono text-xs font-semibold text-brand-900 tabular-nums">{formatClock(elapsed)}</span>}
      {error && (
        <span role="alert" className="max-w-40 text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}

/** Pílula fixa com o cronômetro em andamento, visível em todas as telas. */
export function RunningTimerPill({ taskId, taskTitle, clientName, startedAt }: { taskId: string; taskTitle: string; clientName: string; startedAt: string }) {
  const elapsed = useElapsed(startedAt);
  const pause = useServerAction(() => pauseTimerAction(null, null));
  return (
    <div className="no-print fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-brand-900 py-2 pr-2 pl-4 text-brand-100 shadow-lg ring-1 ring-brand-500/40">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
      </span>
      <a href={`/tarefas/${taskId}`} className="min-w-0 text-xs leading-tight hover:underline">
        <span className="block max-w-56 truncate font-semibold">{taskTitle}</span>
        <span className="block max-w-56 truncate text-brand-200/80">{clientName}</span>
      </a>
      <span className="font-mono text-sm font-semibold tabular-nums">{formatClock(elapsed)}</span>
      <form action={pause.run}>
        <button type="submit" disabled={pause.pending} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Pausar cronômetro">
          {pause.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Pause aria-hidden className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
