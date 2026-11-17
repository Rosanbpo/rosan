export interface HealthInput {
  overdueTasks: number;
  openPendings: number;
  missingDocuments: number;
  /** Tarefas concluídas nos últimos 30 dias e quantas foram no prazo. */
  doneLast30: number;
  doneOnTimeLast30: number;
}

export type HealthLevel = "SAUDAVEL" | "ATENCAO" | "RISCO";

export const HEALTH_LABEL: Record<HealthLevel, string> = {
  SAUDAVEL: "Saudável",
  ATENCAO: "Atenção",
  RISCO: "Em risco",
};

/**
 * Nota de 0 a 100 da saúde operacional do cliente. Começa em 100 e perde pontos por
 * atrasos (até 40), pendências abertas (até 20), documentos faltando (até 20) e
 * baixa pontualidade nos últimos 30 dias (até 20).
 */
export function clientHealth(i: HealthInput): { score: number; level: HealthLevel; reasons: string[] } {
  const reasons: string[] = [];
  const overdue = Math.min(40, i.overdueTasks * 8);
  const pend = Math.min(20, i.openPendings * 5);
  const docs = Math.min(20, i.missingDocuments * 3);
  const punctuality = i.doneLast30 > 0 ? Math.round((1 - i.doneOnTimeLast30 / i.doneLast30) * 20) : 0;
  if (i.overdueTasks) reasons.push(`${i.overdueTasks} tarefa(s) atrasada(s)`);
  if (i.openPendings) reasons.push(`${i.openPendings} pendência(s) aberta(s)`);
  if (i.missingDocuments) reasons.push(`${i.missingDocuments} documento(s) faltando`);
  if (punctuality >= 5) reasons.push("entregas recentes fora do prazo");
  const score = Math.max(0, 100 - overdue - pend - docs - punctuality);
  const level: HealthLevel = score >= 80 ? "SAUDAVEL" : score >= 60 ? "ATENCAO" : "RISCO";
  return { score, level, reasons };
}
