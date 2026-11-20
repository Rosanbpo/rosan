/** Mensalidade em até dois vencimentos no mês. */
export interface Installment {
  day: number;
  amount: number;
}

export function monthlyInstallments(fee: number, day1: number, day2?: number | null, firstPct = 50): Installment[] {
  if (!day2 || day2 === day1) return [{ day: day1, amount: round2(fee) }];
  const pct = Math.min(99, Math.max(1, Math.round(firstPct)));
  const first = round2((fee * pct) / 100);
  const second = round2(fee - first);
  return [
    { day: day1, amount: first },
    { day: day2, amount: second },
  ].sort((a, b) => a.day - b.day);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Texto curto: "dia 10 e dia 25" ou "dia 10". */
export function billingDaysLabel(day1: number | null | undefined, day2?: number | null): string {
  if (!day1) return "—";
  if (!day2 || day2 === day1) return `dia ${day1}`;
  const [a, b] = [day1, day2].sort((x, y) => x - y);
  return `dia ${a} e dia ${b}`;
}

/** Valida o segundo vencimento. Lança mensagem simples para o usuário. */
export function checkSecondDue(day1: number | null | undefined, day2: number | null | undefined): string | null {
  if (!day2) return null;
  if (!day1) return "Informe o primeiro vencimento antes do segundo.";
  if (day1 === day2) return "O segundo vencimento deve ser em outro dia.";
  return null;
}

/** Texto para contrato: "10" ou "10, correspondendo a 50% da mensalidade, e até o dia 25, correspondendo a 50% da mensalidade". */
export function installmentsClauseText(day1: number, day2?: number | null, firstPct = 50): string {
  if (!day2 || day2 === day1) return String(day1);
  const pct = Math.min(99, Math.max(1, Math.round(firstPct)));
  const list = [
    { day: day1, pct },
    { day: day2, pct: 100 - pct },
  ].sort((a, b) => a.day - b.day);
  return `${list[0]!.day}, correspondendo a ${list[0]!.pct}% da mensalidade, e até o dia ${list[1]!.day}, correspondendo a ${list[1]!.pct}% da mensalidade,`;
}
