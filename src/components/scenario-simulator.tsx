"use client";

import { useMemo, useState } from "react";
import { simulate, type ScenarioBase } from "@/domain/scenario";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ScenarioSimulator({ base }: { base: ScenarioBase }) {
  const avg = base.clients ? Math.round(base.mrr / base.clients) : 1500;
  const [c, setC] = useState({ newClients: 2, newTicket: avg, lostClients: 0, raisePct: 0, hoursChangePct: 0 });
  const set = (k: keyof typeof c, v: number) => setC((p) => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }));
  const now = useMemo(() => simulate(base, { newClients: 0, newTicket: 0, lostClients: 0, raisePct: 0, hoursChangePct: 0 }), [base]);
  const r = useMemo(() => simulate(base, c), [base, c]);
  const num = (k: keyof typeof c, label: string, step = 1) => (
    <label className="block text-sm"><span className="font-medium text-slate-700">{label}</span><input type="number" step={step} className="input mt-1" value={c[k]} onChange={(e) => set(k, Number(e.target.value))} /></label>
  );
  const delta = (a: number, b: number, money = false) => { const d = b - a; return `${d >= 0 ? "+" : ""}${money ? brl(d) : Math.round(d * 10) / 10}`; };
  const over = r.utilization !== null && r.utilization > 1;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="card space-y-4 p-5 lg:col-span-1">
        <h2 className="text-[15px] font-semibold text-brand-900">🎛️ O que muda</h2>
        {num("newClients", "Novos clientes")}
        {num("newTicket", "Mensalidade média dos novos (R$)", 50)}
        {num("lostClients", "Clientes que saem")}
        {num("raisePct", "Reajuste nas mensalidades (%)", 0.5)}
        {num("hoursChangePct", "Variação nas horas por cliente (%)", 5)}
        <p className="text-xs text-slate-500">Base atual: {base.clients} clientes, MRR {brl(base.mrr)}, {base.hoursPerClient} h por cliente, capacidade {base.capacityHours} h, custo {brl(base.hourCost)}/h, imposto {base.taxPct}%.</p>
      </section>
      <section className="space-y-4 lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {[["💰 MRR", brl(now.mrr), brl(r.mrr), delta(now.mrr, r.mrr, true)], ["🏢 Clientes", String(now.clients), String(r.clients), delta(now.clients, r.clients)], ["💵 Lucro mensal", brl(now.profit), brl(r.profit), delta(now.profit, r.profit, true)]].map(([t, a, b, d]) => (
            <div key={t} className="rounded-xl border border-hair bg-white p-4"><p className="text-xs font-medium text-slate-500">{t}</p><p className="mt-1 text-xl font-bold text-brand-900">{b}</p><p className="text-xs text-slate-500">hoje {a} · {d}</p></div>
          ))}
        </div>
        <div className={`rounded-xl border p-4 ${over ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="font-semibold text-brand-900">{over ? "🔴 Passa da capacidade da equipe" : "✅ Cabe na capacidade da equipe"}</p>
          <p className="mt-1 text-sm text-slate-700">{r.hours} h necessárias de {base.capacityHours} h ({r.utilization === null ? "—" : pct(r.utilization)}).{over ? ` Faltam ${r.extraCapacityNeeded} h por mês: contrate apoio ou reduza o escopo.` : ""}</p>
          <div className="mt-2 h-2 rounded-full bg-white/70"><div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (r.utilization ?? 0) * 100)}%` }} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-hair bg-white p-4"><p className="text-xs text-slate-500">Custo da equipe</p><p className="font-semibold">{brl(r.cost)}</p></div>
          <div className="rounded-xl border border-hair bg-white p-4"><p className="text-xs text-slate-500">Imposto</p><p className="font-semibold">{brl(r.tax)}</p></div>
          <div className="rounded-xl border border-hair bg-white p-4"><p className="text-xs text-slate-500">Margem</p><p className={`font-semibold ${r.margin >= 0.35 ? "text-emerald-700" : r.margin > 0 ? "text-amber-700" : "text-red-700"}`}>{pct(r.margin)} <span className="font-normal text-slate-500">(meta 35%)</span></p></div>
        </div>
      </section>
    </div>
  );
}
