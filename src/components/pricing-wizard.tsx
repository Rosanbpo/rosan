"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { analyze, recommend, TARGET_MARGIN, type Books, type Diagnosis, type Regime } from "@/domain/consultive-pricing";

const STEPS = ["Diagnóstico", "Análise", "Recomendação", "Decisão", "Proposta", "Contrato"] as const;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Num({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input type="number" min={0} step="any" className="input mt-1" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
function Meter({ label, value, text, tone }: { label: string; value: number; text: string; tone: string }) {
  return (
    <div className="rounded-xl border border-hair p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-900">{text}</p>
      <div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function PricingWizard({ hourCost, capacityHours, usedHours, defaultWage }: { hourCost: number | null; capacityHours: number | null; usedHours: number; defaultWage: number }) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [d, setD] = useState<Diagnosis>({ regime: "SIMPLES", revenue: 50000, bankAccounts: 1, statementLines: 300, entries: 100, employees: 0, inventory: false, multiCnpj: false, cardsAndMarketplaces: false, books: "ORGANIZADA", catchUpMonths: 0, wantsReports: true });
  const [wage, setWage] = useState(defaultWage);
  const [overhead, setOverhead] = useState(15);
  const [tax, setTax] = useState(6);
  const [chosen, setChosen] = useState<number | null>(null);
  const set = <K extends keyof Diagnosis>(k: K, v: Diagnosis[K]) => setD((p) => ({ ...p, [k]: v }));

  const a = useMemo(() => ({ minimumWage: wage, hourCost, overheadPct: overhead, taxPct: tax }), [wage, hourCost, overhead, tax]);
  const an = useMemo(() => analyze(d, a), [d, a]);
  const rec = useMemo(() => recommend(d, an, a), [d, an, a]);
  const price = chosen ?? rec.recommended;
  const margin = rec.margin(price);
  const hh = an.hours.toLocaleString("pt-BR");
  const free = capacityHours === null ? null : Math.max(0, capacityHours - usedHours);
  const fits = free === null ? null : free >= an.hours;
  const q = new URLSearchParams({ empresa: company, valor: price.toFixed(2).replace(".", ",") }).toString();

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} className={`rounded-full border px-3 py-1 text-sm ${i === step ? "border-brand-700 bg-brand-700 text-white" : i < step ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-hair bg-white text-slate-600"}`}>
              {i < step ? "✓" : i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <section className="card p-5">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-brand-900">🔎 Diagnóstico do cliente</h2>
            <label className="block text-sm"><span className="font-medium text-slate-700">Empresa (prospect)</span><input className="input mt-1" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" /></label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm"><span className="font-medium text-slate-700">Regime tributário</span>
                <select className="input mt-1" value={d.regime} onChange={(e) => set("regime", e.target.value as Regime)}>
                  <option value="MEI">MEI</option><option value="SIMPLES">Simples Nacional</option><option value="PRESUMIDO">Lucro Presumido</option><option value="REAL">Lucro Real</option>
                </select></label>
              <Num label="Faturamento mensal do cliente (R$)" value={d.revenue} onChange={(v) => set("revenue", v)} />
              <label className="block text-sm"><span className="font-medium text-slate-700">Como está a contabilidade/financeiro hoje</span>
                <select className="input mt-1" value={d.books} onChange={(e) => set("books", e.target.value as Books)}>
                  <option value="ORGANIZADA">Organizado</option><option value="PARCIAL">Parcialmente organizado</option><option value="DESORGANIZADA">Desorganizado</option>
                </select></label>
              <Num label="Contas bancárias e cartões" value={d.bankAccounts} onChange={(v) => set("bankAccounts", v)} />
              <Num label="Linhas de extrato por mês" value={d.statementLines} onChange={(v) => set("statementLines", v)} hint="Soma de todas as contas." />
              <Num label="Contas a pagar/receber por mês" value={d.entries} onChange={(v) => set("entries", v)} />
              <Num label="Funcionários (folha)" value={d.employees} onChange={(v) => set("employees", v)} />
              <Num label="Meses atrasados para colocar em dia" value={d.catchUpMonths} onChange={(v) => set("catchUpMonths", v)} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Check label="Tem estoque" checked={d.inventory} onChange={(v) => set("inventory", v)} />
              <Check label="Mais de um CNPJ" checked={d.multiCnpj} onChange={(v) => set("multiCnpj", v)} />
              <Check label="Cartões, marketplaces ou maquininhas" checked={d.cardsAndMarketplaces} onChange={(v) => set("cardsAndMarketplaces", v)} />
              <Check label="Quer relatórios (DRE e fluxo de caixa)" checked={d.wantsReports} onChange={(v) => set("wantsReports", v)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-brand-900">📊 Análise</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Meter label="Horas por mês" value={Math.min(100, an.hours * 2)} text={`${hh} h`} tone="bg-sky-500" />
              <Meter label="Complexidade" value={an.complexity} text={`${an.complexityLabel} (${an.complexity})`} tone="bg-violet-500" />
              <Meter label="Risco" value={an.risk} text={`${an.riskLabel} (${an.risk})`} tone={an.risk < 35 ? "bg-emerald-500" : an.risk < 65 ? "bg-amber-500" : "bg-red-500"} />
              <div className="rounded-xl border border-hair p-4"><p className="text-xs font-medium text-slate-500">Custo real do atendimento</p><p className="mt-1 text-xl font-bold text-brand-900">{brl(an.realCost)}</p><p className="text-xs text-slate-500">{hh} h × {brl(an.costHour)}/h + {overhead}% de estrutura</p></div>
            </div>
            <details className="rounded-xl border border-hair p-4 text-sm">
              <summary className="cursor-pointer font-medium">⚙️ Premissas do cálculo</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <Num label="Salário mínimo (R$)" value={wage} onChange={setWage} hint={`Hora cobrada = SM ÷ 220 × 10 = ${brl(an.chargedHour)}`} />
                <Num label="Estrutura/overhead (%)" value={overhead} onChange={setOverhead} />
                <Num label="Imposto sobre o faturamento (%)" value={tax} onChange={setTax} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{hourCost === null ? "Seu custo por hora ainda não foi salvo; usando metade da hora cobrada. Calcule em “Meu custo por hora e planos”." : `Usando o seu custo por hora salvo: ${brl(hourCost)}.`}</p>
            </details>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-brand-900">💡 Recomendação</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {([["Mínimo sustentável", rec.minimum, "Cobre custo e imposto. Abaixo disso você perde dinheiro.", "border-amber-200 bg-amber-50"], ["Recomendado", rec.recommended, "Maior entre horas, piso e tabela por faturamento.", "border-emerald-300 bg-emerald-50"], ["Premium", rec.premium, "Recomendado + 20%, para cliente complexo ou urgente.", "border-violet-200 bg-violet-50"]] as const).map(([t, v, h, c]) => (
                <button key={t} type="button" onClick={() => setChosen(v)} className={`rounded-xl border p-4 text-left ${c} ${price === v ? "ring-2 ring-brand-700" : ""}`}>
                  <p className="text-xs font-semibold">{t}</p><p className="mt-1 text-2xl font-bold text-brand-900">{brl(v)}</p><p className="text-xs text-slate-600">{h}</p><p className="mt-1 text-xs font-medium">Margem {pct(rec.margin(v))}</p>
                </button>
              ))}
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>Por horas ({hh} h × {brl(an.chargedHour)}): <strong>{brl(rec.byHours)}</strong></li>
              <li>Piso (0,5 salário mínimo): <strong>{brl(rec.floor)}</strong></li>
              <li>Tabela por faturamento: <strong>{brl(rec.byTable)}</strong></li>
              <li>Para atingir {pct(TARGET_MARGIN)} de margem: <strong>{brl(rec.priceForTargetMargin)}</strong></li>
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-brand-900">⚖️ Decisão</h2>
            <label className="block max-w-xs text-sm"><span className="font-medium text-slate-700">Valor da mensalidade (R$)</span><input type="number" min={0} className="input mt-1" value={price} onChange={(e) => setChosen(Number(e.target.value))} /></label>
            <div className="grid gap-3 md:grid-cols-3">
              <div className={`rounded-xl border p-4 text-sm ${margin >= TARGET_MARGIN ? "border-emerald-200 bg-emerald-50" : margin > 0 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                <p className="font-semibold">{margin >= TARGET_MARGIN ? "✅ Margem saudável" : margin > 0 ? "⚠️ Margem abaixo da meta" : "🔴 Prejuízo"}</p>
                <p className="mt-1">Margem líquida de {pct(margin)} (meta {pct(TARGET_MARGIN)}). Lucro de {brl(price - price * (tax / 100) - an.realCost)} por mês.</p>
              </div>
              <div className={`rounded-xl border p-4 text-sm ${fits === null ? "border-hair" : fits ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="font-semibold">{fits === null ? "Capacidade não informada" : fits ? "✅ Cabe na agenda" : "🔴 Não cabe na agenda"}</p>
                <p className="mt-1">{fits === null ? "Informe as horas da equipe em Configuração para comparar." : `Este cliente pede ${hh} h/mês e há ${Math.round(free ?? 0)} h livres este mês.`}</p>
              </div>
              <div className="rounded-xl border border-hair p-4 text-sm"><p className="font-semibold">Risco {an.riskLabel.toLowerCase()}</p><p className="mt-1">{an.risk >= 65 ? "Considere cobrar o premium e limitar o escopo." : an.risk >= 35 ? "Combine bem o escopo e os prazos de entrega dos documentos." : "Cliente de baixo risco."}</p></div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-base font-semibold text-brand-900">📄 Proposta</h2>
            <p>Gere a proposta com a empresa e o valor de <strong>{brl(price)}</strong> já preenchidos.</p>
            <Link href={`/propostas/nova?${q}`} className="btn-primary inline-flex">Criar proposta</Link>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-base font-semibold text-brand-900">✍️ Contrato</h2>
            <p>Com a proposta aceita, crie o contrato a partir dela. Ele traz escopo, valor e vencimentos.</p>
            <div className="flex gap-2"><Link href="/propostas" className="btn-secondary">Ver propostas</Link><Link href="/contratos/novo" className="btn-primary">Novo contrato</Link></div>
          </div>
        )}
      </section>

      <div className="flex justify-between">
        <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>← Voltar</button>
        {step < STEPS.length - 1 && <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>Avançar →</button>}
      </div>
    </div>
  );
}
