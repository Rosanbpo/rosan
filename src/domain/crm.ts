import { LEAD_STAGE_PROBABILITY, OPEN_LEAD_STAGES, type LeadStage } from "./enums";

export function isOpenStage(stage: LeadStage): boolean {
  return (OPEN_LEAD_STAGES as readonly string[]).includes(stage);
}

/** Previsão de receita recorrente: soma ponderada pela probabilidade da etapa. */
export function weightedForecast(leads: Array<{ stage: LeadStage; expectedFee: number | null }>): {
  openFee: number;
  weightedFee: number;
} {
  let openFee = 0;
  let weightedFee = 0;
  for (const lead of leads) {
    if (!isOpenStage(lead.stage) || !lead.expectedFee) continue;
    openFee += lead.expectedFee;
    weightedFee += lead.expectedFee * LEAD_STAGE_PROBABILITY[lead.stage];
  }
  return { openFee: Math.round(openFee * 100) / 100, weightedFee: Math.round(weightedFee * 100) / 100 };
}

/** Taxa de conversão: ganhos ÷ (ganhos + perdidos). Nulo sem negócios encerrados. */
export function conversionRate(won: number, lost: number): number | null {
  const closed = won + lost;
  return closed === 0 ? null : won / closed;
}
