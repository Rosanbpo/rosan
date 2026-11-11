"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { calculatePricing, type PricingPlan } from "@/domain/pricing";
import { fmtHours, fmtMoney, fmtPercent } from "@/lib/format";
import { cx } from "@/lib/ui";
import { ActionForm, SubmitButton } from "./ui/action-form";

type Cost = { label: string; amount: string };
type Task = { name: string; minutes: string };
type Plan = { name: string; finalPrice: string; tasks: Task[] };

export interface PricingInitial {
  costs: { label: string; amount: number }[];
  hoursPerDay: number;
  daysPerMonth: number;
  safetyFactor: number;
  markup: number;
  taxPercent: number;
  plans: { name: string; finalPrice: number | null; tasks: { name: string; minutes: number }[] }[];
}

/** Aceita "1.500,50", "1500.5" e "1,6". */
function num(v: string): number {
  const t = v.trim().replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : 0;
}
const txt = (n: number) => String(n).replace(".", ",");

export function PricingForm({
  action,
  applyAction,
  canApply,
  saved,
  currentHourCost,
  initial,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  applyAction: (s: ActionState, fd: FormData) => Promise<ActionState>;
  canApply: boolean;
  saved: boolean;
  currentHourCost: number | null;
  initial: PricingInitial;
}) {
  const [costs, setCosts] = useState<Cost[]>(initial.costs.map((c) => ({ label: c.label, amount: txt(c.amount) })));
  const [hoursPerDay, setHoursPerDay] = useState(txt(initial.hoursPerDay));
  const [daysPerMonth, setDaysPerMonth] = useState(txt(initial.daysPerMonth));
  const [safety, setSafety] = useState(txt(initial.safetyFactor));
  const [markup, setMarkup] = useState(txt(initial.markup));
  const [tax, setTax] = useState(txt(initial.taxPercent));
  const [plans, setPlans] = useState<Plan[]>(
    initial.plans.map((p) => ({
      name: p.name,
      finalPrice: p.finalPrice === null ? "" : txt(p.finalPrice),
      tasks: p.tasks.map((t) => ({ name: t.name, minutes: txt(t.minutes) })),
    })),
  );

  const result = useMemo(
    () =>
      calculatePricing({
        costs: costs.map((c) => ({ label: c.label, amount: num(c.amount) })),
        hoursPerDay: num(hoursPerDay),
        daysPerMonth: num(daysPerMonth),
        safetyFactor: num(safety) || 1,
        markup: num(markup) || 1,
        taxRate: num(tax) / 100,
        plans: plans.map((p): PricingPlan => ({
          name: p.name,
          finalPrice: p.finalPrice.trim() === "" ? null : num(p.finalPrice),
          tasks: p.tasks.map((t) => ({ name: t.name, minutes: num(t.minutes) })),
        })),
      }),
    [costs, hoursPerDay, daysPerMonth, safety, markup, tax, plans],
  );

  const payload = JSON.stringify({
    costs,
    hoursPerDay,
    daysPerMonth,
    safetyFactor: safety,
    markup,
    taxPercent: tax,
    plans: plans.map((p) => ({ name: p.name, finalPrice: p.finalPrice, tasks: p.tasks })),
  });

  const setPlan = (i: number, patch: Partial<Plan>) => setPlans((all) => all.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const setTask = (i: number, j: number, patch: Partial<Task>) =>
    setPlan(i, { tasks: plans[i].tasks.map((t, k) => (k === j ? { ...t, ...patch } : t)) });

  return (
    <div className="space-y-6">
      <ActionForm action={action} className="space-y-6">
        <input type="hidden" name="payload" value={payload} />

        <section className="card p-5" aria-labelledby="p1">
          <h2 id="p1" className="text-sm font-semibold">
            Passo 1 — Custos mensais do negócio
          </h2>
          <p className="mt-1 text-xs text-slate-500">Tudo o que custa manter a Rosan funcionando em um mês, inclusive o seu pró-labore.</p>
          <div className="mt-3 grid gap-2">
            {costs.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_9rem_2rem] gap-2">
                <input aria-label="Custo" className="input" value={c.label} onChange={(e) => setCosts((a) => a.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                <input aria-label="Valor (R$)" inputMode="decimal" className="input text-right" value={c.amount} onChange={(e) => setCosts((a) => a.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} />
                <button type="button" className="text-slate-400 hover:text-red-600" aria-label="Remover custo" onClick={() => setCosts((a) => a.filter((_, k) => k !== i))}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" className="btn-secondary" onClick={() => setCosts((a) => [...a, { label: "", amount: "0" }])}>
              <Plus aria-hidden className="h-4 w-4" /> Adicionar custo
            </button>
            <p className="text-sm">
              Total do mês: <strong>{fmtMoney(result.totalCosts)}</strong>
            </p>
          </div>
        </section>

        <section className="card grid gap-4 p-5 md:grid-cols-4" aria-labelledby="p2">
          <h2 id="p2" className="text-sm font-semibold md:col-span-4">
            Passo 2 — Custo por hora
          </h2>
          <label className="text-sm">
            Horas de trabalho por dia
            <input className="input mt-1" inputMode="decimal" value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} />
          </label>
          <label className="text-sm">
            Dias de trabalho por mês
            <input className="input mt-1" inputMode="decimal" value={daysPerMonth} onChange={(e) => setDaysPerMonth(e.target.value)} />
          </label>
          <label className="text-sm">
            Margem de segurança
            <input className="input mt-1" inputMode="decimal" value={safety} onChange={(e) => setSafety(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-500">1,10 = +10% sobre o custo</span>
          </label>
          <div className="rounded-md bg-brand-50 p-3 text-sm">
            <p className="text-xs text-slate-600">Horas no mês: {result.hoursPerMonth.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-slate-600">Custo/hora mínimo: {fmtMoney(result.minHourCost)}</p>
            <p className="mt-1 font-semibold text-brand-900">Custo/hora: {fmtMoney(result.hourCost)}</p>
          </div>
        </section>

        <section className="card grid gap-4 p-5 md:grid-cols-2" aria-labelledby="p3">
          <h2 id="p3" className="text-sm font-semibold md:col-span-2">
            Passo 3 — Margem e imposto
          </h2>
          <label className="text-sm">
            Margem de lucro desejada
            <input className="input mt-1" inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-500">1,6 = 60% sobre o custo do plano</span>
          </label>
          <label className="text-sm">
            Imposto sobre o faturamento (%)
            <input className="input mt-1" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
          </label>
        </section>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Passo 4 — Planos: tempo de cada tarefa e preço</h2>
          {plans.map((plan, i) => {
            const r = result.plans[i];
            return (
              <section key={i} className="card p-5" aria-label={`Plano ${plan.name}`}>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-48 flex-1 text-sm">
                    Nome do plano
                    <input className="input mt-1" value={plan.name} onChange={(e) => setPlan(i, { name: e.target.value })} />
                  </label>
                  <label className="w-44 text-sm">
                    Preço praticado (R$)
                    <input className="input mt-1" inputMode="decimal" value={plan.finalPrice} placeholder={fmtMoney(r.price).replace("R$ ", "")} onChange={(e) => setPlan(i, { finalPrice: e.target.value })} />
                  </label>
                  <button type="button" className="btn-secondary" onClick={() => window.confirm("Remover este plano?") && setPlans((a) => a.filter((_, k) => k !== i))}>
                    <Trash2 aria-hidden className="h-4 w-4" /> Remover plano
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {plan.tasks.map((t, j) => (
                    <div key={j} className="grid grid-cols-[1fr_7rem_2rem] gap-2">
                      <input aria-label="Tarefa" className="input" value={t.name} onChange={(e) => setTask(i, j, { name: e.target.value })} />
                      <input aria-label="Minutos por mês" inputMode="numeric" className="input text-right" value={t.minutes} onChange={(e) => setTask(i, j, { minutes: e.target.value })} />
                      <button type="button" className="text-slate-400 hover:text-red-600" aria-label="Remover tarefa" onClick={() => setPlan(i, { tasks: plan.tasks.filter((_, k) => k !== j) })}>
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Tempo de cada tarefa em minutos por mês.</p>
                </div>
                <button type="button" className="btn-secondary mt-2" onClick={() => setPlan(i, { tasks: [...plan.tasks, { name: "", minutes: "30" }] })}>
                  <Plus aria-hidden className="h-4 w-4" /> Adicionar tarefa
                </button>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-sm md:grid-cols-6">
                  <Stat label="Tempo do plano" value={fmtHours(r.minutes)} />
                  <Stat label="Custo do plano" value={fmtMoney(r.cost)} />
                  <Stat label="Preço sugerido" value={fmtMoney(r.suggestedPrice)} />
                  <Stat label="Preço praticado" value={fmtMoney(r.price)} strong />
                  <Stat label={`Imposto (${tax}%)`} value={fmtMoney(r.tax)} />
                  <Stat label="Lucro líquido" value={`${fmtMoney(r.profit)} · ${fmtPercent(r.profitMargin)}`} tone={r.profit < 0 ? "bad" : "good"} />
                </dl>
              </section>
            );
          })}
          <button type="button" className="btn-secondary" onClick={() => setPlans((a) => [...a, { name: "Novo plano", finalPrice: "", tasks: [{ name: "", minutes: "60" }] }])}>
            <Plus aria-hidden className="h-4 w-4" /> Adicionar plano
          </button>
        </div>

        <div className="flex gap-2">
          <SubmitButton>Salvar precificação</SubmitButton>
        </div>
      </ActionForm>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Usar na rentabilidade</h2>
        <p className="mt-1 text-sm text-slate-600">
          O custo da hora usado em Carteira e rentabilidade hoje é <strong>{currentHourCost === null ? "não definido" : fmtMoney(currentHourCost)}</strong>. Salve a precificação e aplique o valor calculado ({fmtMoney(result.hourCost)}).
          {!saved && " (Ainda não há precificação salva.)"}
        </p>
        {canApply ? (
          <ActionForm action={applyAction} className="mt-3" confirm="Atualizar o custo da hora da empresa com o valor salvo da precificação?">
            <SubmitButton className={cx("btn-secondary")}>Aplicar custo da hora</SubmitButton>
          </ActionForm>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Somente administradores podem alterar o custo da hora.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "bad" }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cx("font-medium", strong && "text-brand-900", tone === "good" && "text-emerald-700", tone === "bad" && "text-red-700")}>{value}</dd>
    </div>
  );
}
