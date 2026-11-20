/**
 * Precificação consultiva de um novo cliente (diagnóstico → análise → recomendação).
 * Fórmulas:
 *  hora cobrada     = salário mínimo ÷ 220 × 10
 *  horas do cliente = (conciliação + lançamentos + folha + relatórios) × fator de complexidade
 *  conciliação      = contas × 90 min + linhas de extrato × 11 s
 *  custo real       = horas × custo-hora × (1 + overhead)
 *  mínimo sustentável = custo real ÷ (1 − imposto)
 *  recomendado      = maior entre horas × hora cobrada, piso (0,5 SM), tabela por faturamento e mínimo sustentável
 *  premium          = recomendado + 20%
 */
export const DEFAULT_MINIMUM_WAGE = 1621;
export const TARGET_MARGIN = 0.35;

export type Regime = "MEI" | "SIMPLES" | "PRESUMIDO" | "REAL";
export type Books = "ORGANIZADA" | "PARCIAL" | "DESORGANIZADA";

export interface Diagnosis {
  regime: Regime;
  revenue: number;
  bankAccounts: number;
  statementLines: number;
  entries: number;
  employees: number;
  inventory: boolean;
  multiCnpj: boolean;
  cardsAndMarketplaces: boolean;
  books: Books;
  catchUpMonths: number;
  wantsReports: boolean;
}
export interface PricingAssumptions {
  minimumWage: number;
  /** Custo real da sua hora; se ausente, assume metade da hora cobrada. */
  hourCost: number | null;
  overheadPct: number;
  taxPct: number;
}

export interface Analysis {
  minutes: number;
  hours: number;
  complexity: number;
  complexityLabel: "Baixa" | "Média" | "Alta";
  risk: number;
  riskLabel: "Baixo" | "Médio" | "Alto";
  chargedHour: number;
  costHour: number;
  realCost: number;
}
export interface Recommendation {
  floor: number;
  byHours: number;
  byTable: number;
  minimum: number;
  recommended: number;
  premium: number;
  margin: (price: number) => number;
  priceForTargetMargin: number;
}

const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
const up10 = (v: number) => Math.ceil(v / 10) * 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

export function chargedHourRate(minimumWage: number) {
  return round2((minimumWage / 220) * 10);
}

export function analyze(d: Diagnosis, a: PricingAssumptions): Analysis {
  const reconciliation = n(d.bankAccounts) * 90 + (n(d.statementLines) * 11) / 60;
  const entries = n(d.entries) * 3;
  const payroll = n(d.employees) * 10;
  const reports = d.wantsReports ? 120 : 0;
  let factor = 1;
  if (d.inventory) factor += 0.1;
  if (d.multiCnpj) factor += 0.15;
  if (d.cardsAndMarketplaces) factor += 0.1;
  if (d.books === "PARCIAL") factor += 0.1;
  if (d.books === "DESORGANIZADA") factor += 0.25;
  if (d.revenue > 200_000) factor += 0.1;
  const minutes = Math.round((reconciliation + entries + payroll + reports) * factor);
  const complexity = Math.min(100, Math.round((factor - 1) * 200 + Math.min(40, minutes / 30)));
  const risk = Math.min(
    100,
    ({ MEI: 5, SIMPLES: 15, PRESUMIDO: 30, REAL: 45 } as const)[d.regime] +
      ({ ORGANIZADA: 0, PARCIAL: 15, DESORGANIZADA: 30 } as const)[d.books] +
      Math.min(25, n(d.catchUpMonths) * 5),
  );
  const chargedHour = chargedHourRate(a.minimumWage);
  const costHour = a.hourCost ?? round2(chargedHour * 0.5);
  const hours = minutes / 60;
  return {
    minutes,
    hours: round2(hours),
    complexity,
    complexityLabel: complexity < 35 ? "Baixa" : complexity < 65 ? "Média" : "Alta",
    risk,
    riskLabel: risk < 35 ? "Baixo" : risk < 65 ? "Médio" : "Alto",
    chargedHour,
    costHour,
    realCost: round2(hours * costHour * (1 + a.overheadPct / 100)),
  };
}

/** Piso por faixa de faturamento mensal do cliente, em múltiplos do salário mínimo. */
export function tableFloor(revenue: number, minimumWage: number) {
  const mult = revenue <= 30_000 ? 1 : revenue <= 100_000 ? 1.5 : revenue <= 300_000 ? 2.5 : 4;
  return mult * minimumWage;
}

export function recommend(d: Diagnosis, an: Analysis, a: PricingAssumptions): Recommendation {
  const tax = a.taxPct / 100;
  const floor = 0.5 * a.minimumWage;
  const byHours = an.hours * an.chargedHour;
  const byTable = tableFloor(d.revenue, a.minimumWage);
  const minimum = an.realCost / (1 - tax);
  const recommended = up10(Math.max(byHours, floor, byTable, minimum));
  const margin = (price: number) => (price > 0 ? (price - price * tax - an.realCost) / price : 0);
  return {
    floor: round2(floor),
    byHours: round2(byHours),
    byTable: round2(byTable),
    minimum: up10(minimum),
    recommended,
    premium: up10(recommended * 1.2),
    margin,
    priceForTargetMargin: up10(an.realCost / (1 - tax - TARGET_MARGIN)),
  };
}

export interface VolumeCheck {
  baselineUnits: number;
  currentUnits: number;
  growth: number;
  level: "ok" | "atencao" | "reajustar";
  suggestedFee: number | null;
}

/** "Unidades de trabalho" do mês: linhas de extrato (11 s) + lançamentos (3 min), em minutos. */
export function volumeUnits(v: { statementLines: number; entries: number }) {
  return (n(v.statementLines) * 11) / 60 + n(v.entries) * 3;
}

/**
 * Compara a movimentação do mês com a que foi usada na precificação.
 * Cresceu 15% ou mais: atenção. 30% ou mais (ou a recomendação nova passa 10% da mensalidade): reajustar.
 */
export function checkVolume(d: Diagnosis, current: { statementLines: number; entries: number }, a: PricingAssumptions, pricedFee: number | null): VolumeCheck {
  const baselineUnits = volumeUnits(d);
  const currentUnits = volumeUnits(current);
  const growth = baselineUnits > 0 ? currentUnits / baselineUnits - 1 : 0;
  const next = { ...d, statementLines: current.statementLines, entries: current.entries };
  const suggested = recommend(next, analyze(next, a), a).recommended;
  const overFee = pricedFee !== null && pricedFee > 0 && suggested > pricedFee * 1.1;
  const level = growth >= 0.3 || (overFee && growth >= 0.15) ? "reajustar" : growth >= 0.15 ? "atencao" : "ok";
  return { baselineUnits: Math.round(baselineUnits), currentUnits: Math.round(currentUnits), growth, level, suggestedFee: level === "ok" ? null : suggested };
}
