import { addMonths, parseLocalDate, type LocalDate } from "./dates";

/** Documentos que normalmente o cliente envia todo mês ao BPO financeiro. */
export const DEFAULT_DOCUMENTS: Array<{ name: string; required: boolean }> = [
  { name: "Extratos bancários", required: true },
  { name: "Extratos de cartão de crédito", required: true },
  { name: "Notas fiscais emitidas (vendas e serviços)", required: true },
  { name: "Notas fiscais de compras e despesas", required: true },
  { name: "Comprovantes de pagamento", required: true },
  { name: "Boletos e contas a pagar do mês", required: true },
  { name: "Folha de pagamento e encargos", required: false },
  { name: "Guias de impostos pagas", required: false },
];

const COMPETENCE = /^\d{4}-(0[1-9]|1[0-2])$/;
export function isCompetence(value: string | undefined | null): value is string {
  return !!value && COMPETENCE.test(value);
}

/** Competência do mês anterior à data: é o mês cujos documentos chegam agora. */
export function previousCompetence(today: LocalDate): string {
  const { y, m } = parseLocalDate(today);
  const t = addMonths(y, m, -1);
  return `${t.y}-${String(t.m).padStart(2, "0")}`;
}

export function shiftCompetence(competence: string, delta: number): string {
  const [y, m] = competence.split("-").map(Number);
  const t = addMonths(y, m, delta);
  return `${t.y}-${String(t.m).padStart(2, "0")}`;
}
