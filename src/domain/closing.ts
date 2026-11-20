/** Fechamento mensal do cliente: itens padrão do checklist. */
export const DEFAULT_CLOSING_ITEMS = [
  "Conciliar todas as contas bancárias e cartões",
  "Classificar os lançamentos do mês",
  "Conferir contas a pagar e a receber em aberto",
  "Conferir se todos os documentos do mês foram recebidos",
  "Revisar o DRE e o fluxo de caixa",
  "Enviar o relatório do mês ao cliente",
  "Registrar o que ficou pendente para o próximo mês",
] as const;

export function isCompetenceMonth(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function closingProgress(items: Array<{ doneAt: Date | string | null }>) {
  const done = items.filter((i) => i.doneAt).length;
  const total = items.length;
  return { done, total, pending: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}
