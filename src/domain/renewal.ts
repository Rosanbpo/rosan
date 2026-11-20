import { addDays, addMonths, compareLocalDate, daysInMonth, diffInDays, makeLocalDate, parseLocalDate, type LocalDate } from "./dates";

function plusMonths(date: LocalDate, delta: number): LocalDate {
  const { y, m, d } = parseLocalDate(date);
  const t = addMonths(y, m, delta);
  return makeLocalDate(t.y, t.m, Math.min(d, daysInMonth(t.y, t.m)));
}

export interface ContractTimeline {
  /** Fim do prazo inicial (início + prazo em meses). */
  termEnd: LocalDate;
  daysToTermEnd: number;
  /** Próximo aniversário (reajuste anual). */
  nextAnniversary: LocalDate;
  daysToAnniversary: number;
}

export function contractTimeline(startDate: LocalDate, termMonths: number, today: LocalDate): ContractTimeline {
  const termEnd = addDays(plusMonths(startDate, termMonths), -1);
  let k = 1;
  let ann = plusMonths(startDate, 12);
  while (compareLocalDate(ann, today) < 0) ann = plusMonths(startDate, 12 * ++k);
  return { termEnd, daysToTermEnd: diffInDays(today, termEnd), nextAnniversary: ann, daysToAnniversary: diffInDays(today, ann) };
}

/** Valor reajustado por um índice percentual (ex.: 4,5 para 4,5%), arredondado a 10 centavos. */
export function adjustedFee(fee: number, indexPct: number): number {
  return Math.round(fee * (1 + indexPct / 100) * 10) / 10;
}

export const CHURN_REASONS = ["Preço", "Insatisfação com o serviço", "Mudou para equipe interna", "Fechou a empresa", "Trocou de fornecedor", "Inadimplência", "Outro"] as const;
