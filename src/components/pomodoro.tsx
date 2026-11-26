"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pauseTimerAction, startTimerAction } from "@/app/actions/timer";

export interface FocusTask {
  id: string;
  title: string;
  client: string | null;
  overdue: boolean;
}

type Phase = "idle" | "focus" | "short" | "long";
interface Saved {
  phase: Phase;
  endsAt: number;
  total: number;
  taskId: string | null;
  cycle: number;
  track: boolean;
  tiny: boolean;
}
const KEY = "rosan-pomodoro-v1";
const DAYKEY = "rosan-pomodoro-dia";
const PRESETS = [
  { id: "25", label: "25 min foco · 5 pausa", focus: 25, short: 5, long: 15 },
  { id: "50", label: "50 min foco · 10 pausa", focus: 50, short: 10, long: 25 },
  { id: "15", label: "15 min foco · 3 pausa", focus: 15, short: 3, long: 10 },
] as const;
const GOAL = 8;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
  } catch {}
}

export function Pomodoro({ tasks, running, initialTaskId }: { tasks: FocusTask[]; running: string | null; initialTaskId?: string | null }) {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(PRESETS[0]);
  const [taskId, setTaskId] = useState<string>(initialTaskId && tasks.some((t) => t.id === initialTaskId) ? initialTaskId : running ?? tasks[0]?.id ?? "");
  const [track, setTrack] = useState(true);
  const [state, setState] = useState<Saved | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as Saved);
      const d = JSON.parse(localStorage.getItem(DAYKEY) ?? "null") as { day: string; n: number } | null;
      if (d?.day === today()) setDone(d.n);
    } catch {}
  }, []);

  const persist = useCallback((s: Saved | null) => {
    setState(s);
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const remaining = state && state.phase !== "idle" ? state.endsAt - now : 0;
  const active = !!state && state.phase !== "idle";

  const start = useCallback(
    async (phase: Phase, minutes: number, opts: { cycle: number; tiny?: boolean }) => {
      finished.current = false;
      setMsg(null);
      persist({ phase, endsAt: Date.now() + minutes * 60000, total: minutes * 60000, taskId: taskId || null, cycle: opts.cycle, track, tiny: !!opts.tiny });
      if (phase === "focus" && track && taskId && running !== taskId) await startTimerAction(taskId, null);
      if (phase === "focus" && typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    },
    [persist, taskId, track, running],
  );

  const stopTracking = useCallback(async () => {
    if (state?.track && state.taskId) await pauseTimerAction(state.taskId, null);
  }, [state]);

  useEffect(() => {
    if (!state || state.phase === "idle" || remaining > 0 || finished.current) return;
    finished.current = true;
    beep();
    const wasFocus = state.phase === "focus";
    if (wasFocus) {
      const n = done + 1;
      setDone(n);
      try {
        localStorage.setItem(DAYKEY, JSON.stringify({ day: today(), n }));
      } catch {}
      void stopTracking();
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(wasFocus ? "Foco concluído. Hora de uma pausa." : "Pausa acabou. Vamos voltar?");
    setMsg(wasFocus ? (state.tiny ? "Cinco minutos feitos. Você já começou, o mais difícil passou. Quer continuar?" : "Foco concluído. Respire, levante, beba água.") : "Pausa acabou. Pronta para o próximo?");
    persist({ ...state, phase: "idle" });
  }, [remaining, state, done, persist, stopTracking]);

  useEffect(() => {
    document.title = active ? `${mmss(remaining)} · ${state?.phase === "focus" ? "Foco" : "Pausa"}` : "Foco";
  }, [active, remaining, state]);

  const cycle = state?.cycle ?? 0;
  const label = state?.phase === "focus" ? "Foco" : state?.phase === "short" ? "Pausa curta" : state?.phase === "long" ? "Pausa longa" : "Pronta?";
  const pct = active && state ? Math.min(100, Math.max(0, 100 - (remaining / state.total) * 100)) : 0;
  const current = tasks.find((t) => t.id === (state?.taskId ?? taskId));
  const nextBreak = (c: number) => (c % 4 === 0 ? ("long" as const) : ("short" as const));

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_18rem]">
      <section className="card p-6 text-center" aria-label="Cronômetro de foco">
        <p className={`text-sm font-medium ${state?.phase === "focus" ? "text-red-700" : active ? "text-emerald-700" : "text-slate-500"}`}>{label}</p>
        <p className="my-3 text-7xl font-semibold tabular-nums text-brand-900" role="timer" aria-live="off">
          {active ? mmss(remaining) : mmss(preset.focus * 60000)}
        </p>
        <div className="mx-auto mb-4 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full transition-[width] ${state?.phase === "focus" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </div>
        {current && <p className="mb-4 text-sm text-slate-600">{state?.phase === "focus" || !active ? "Tarefa: " : "Próxima: "}<strong className="font-medium">{current.title}</strong>{current.client ? ` · ${current.client}` : ""}</p>}
        {msg && <p role="status" className="mx-auto mb-4 max-w-md rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}

        {!active ? (
          <div className="space-y-3">
            <button className="btn-primary px-8 py-3 text-base" onClick={() => start("focus", preset.focus, { cycle })}>Começar foco</button>
            <div>
              <button className="btn-secondary" onClick={() => start("focus", 5, { cycle, tiny: true })} title="Quando está difícil começar: só cinco minutos, sem compromisso de continuar">
                Está difícil começar? Só 5 minutos
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {state?.phase === "focus" ? (
              <>
                <button className="btn-secondary" onClick={async () => { await stopTracking(); persist(null); }}>Parar</button>
                <button className="btn-secondary" onClick={() => persist({ ...state, endsAt: state.endsAt + 5 * 60000, total: state.total + 5 * 60000 })}>+5 min</button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => start("focus", preset.focus, { cycle })}>Pular pausa</button>
            )}
          </div>
        )}

        {!active && state?.phase === "idle" && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {state.total > 0 && state.cycle >= 0 && (
              <button className="btn-secondary" onClick={() => start(nextBreak(state.cycle + 1) === "long" ? "long" : "short", nextBreak(state.cycle + 1) === "long" ? preset.long : preset.short, { cycle: state.cycle + 1 })}>
                Fazer a pausa {nextBreak(state.cycle + 1) === "long" ? "longa" : "curta"}
              </button>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-brand-900">Hoje</h2>
          <p className="mb-2 flex flex-wrap gap-1" aria-label={`${done} de ${GOAL} focos`}>
            {Array.from({ length: GOAL }, (_, i) => (
              <span key={i} aria-hidden className={`h-4 w-4 rounded-full ${i < done ? "bg-red-500" : "bg-slate-200"}`} />
            ))}
          </p>
          <p className="text-xs text-slate-500">{done} de {GOAL} focos · {done * preset.focus} min de trabalho concentrado</p>
        </section>
        <section className="card space-y-3 p-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">No que vou focar</span>
            <select className="input mt-1" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={active}>
              <option value="">Sem tarefa específica</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.overdue ? "⚠ " : ""}{t.title}{t.client ? ` · ${t.client}` : ""}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} disabled={active} /> Contar o tempo na tarefa
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Ritmo</span>
            <select className="input mt-1" value={preset.id} onChange={(e) => setPreset(PRESETS.find((p) => p.id === e.target.value) ?? PRESETS[0])} disabled={active}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        </section>
        <section className="card p-4 text-xs text-slate-600">
          <h2 className="mb-1 text-sm font-semibold text-brand-900">Para vencer a procrastinação</h2>
          <ul className="list-disc space-y-1 pl-4">
            <li>Escolha uma tarefa só e comece por ela. A mais urgente aparece primeiro na lista.</li>
            <li>Sem vontade? Use “Só 5 minutos”. Começar é a parte difícil.</li>
            <li>Durante o foco, não abra e-mail nem WhatsApp. Anote o que surgir e resolva na pausa.</li>
            <li>A cada 4 focos, faça a pausa longa.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
