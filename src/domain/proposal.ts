import { addDays } from "./dates";

export const PROPOSAL_STATUSES = ["RASCUNHO", "ENVIADA", "ACEITA", "RECUSADA"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

export const DEFAULT_VALIDITY_DAYS = 15;

/** Divide "Esquerda | Direita" em duas partes; sem barra, a direita fica vazia. */
export function splitPair(line: string): { left: string; right: string } {
  const i = line.indexOf("|");
  if (i === -1) return { left: line.trim(), right: "" };
  return { left: line.slice(0, i).trim(), right: line.slice(i + 1).trim() };
}

/** Quebra um texto em linhas não vazias. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Número sequencial por ano: 2026-001. */
export function formatProposalNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(3, "0")}`;
}

/** Próximo número, dado o maior número já usado no ano (ex.: "2026-007" → "2026-008"). */
export function nextProposalNumber(year: number, lastNumber: string | null): string {
  if (!lastNumber || !lastNumber.startsWith(`${year}-`)) return formatProposalNumber(year, 1);
  const seq = Number(lastNumber.split("-")[1]);
  return formatProposalNumber(year, Number.isFinite(seq) ? seq + 1 : 1);
}

export function defaultValidUntil(today: string, days = DEFAULT_VALIDITY_DAYS): string {
  return addDays(today, days);
}

/** Proposta enviada cuja validade já passou. */
export function isProposalExpired(status: ProposalStatus, validUntil: string, today: string): boolean {
  return status === "ENVIADA" && validUntil < today;
}

/** Etapas do funil que avançam para "Proposta enviada" quando a proposta é enviada. */
export const STAGES_BEFORE_PROPOSAL = ["NOVO", "CONTATO", "REUNIAO"] as const;
