/** Rentabilidade de um cliente no período: mensalidade − (horas apontadas × custo da hora). */
export interface Profitability {
  hours: number;
  cost: number | null;
  margin: number | null;
  /** Margem sobre a mensalidade (0–1). Nulo quando não há mensalidade ou custo da hora. */
  marginPct: number | null;
}

export function clientProfitability(input: {
  monthlyFee: number | null;
  minutes: number;
  hourCost: number | null;
}): Profitability {
  const hours = Math.round((input.minutes / 60) * 100) / 100;
  const cost = input.hourCost === null ? null : round2(hours * input.hourCost);
  const margin = input.monthlyFee === null || cost === null ? null : round2(input.monthlyFee - cost);
  const marginPct = margin === null || !input.monthlyFee ? null : margin / input.monthlyFee;
  return { hours, cost, margin, marginPct };
}

/** Faixa de saúde da margem, para destacar clientes no painel. */
export function marginTone(marginPct: number | null): "success" | "warning" | "danger" | "neutral" {
  if (marginPct === null) return "neutral";
  if (marginPct < 0.15) return "danger";
  if (marginPct < 0.35) return "warning";
  return "success";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
