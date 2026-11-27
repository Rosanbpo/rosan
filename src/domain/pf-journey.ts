// Jornada da Consultoria Financeira Pessoal (30 dias + continuidade). Regras puras, sem Prisma.

export const SERVICE_LINES = ["BPO_FINANCEIRO", "CONSULTORIA_PF"] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];
export const SERVICE_LINE_LABEL: Record<ServiceLine, string> = {
  BPO_FINANCEIRO: "BPO Financeiro",
  CONSULTORIA_PF: "Consultoria Financeira Pessoa Física",
};

export const PF_STATUSES = [
  "NOVO_INTERESSADO",
  "AGUARDANDO_CONTRATACAO",
  "CONTRATACAO_CONFIRMADA",
  "AGUARDANDO_DIAGNOSTICO",
  "DIAGNOSTICO_EM_PREPARACAO",
  "PRIMEIRA_REUNIAO_AGENDADA",
  "DIAGNOSTICO_REALIZADO",
  "PLANEJAMENTO_EM_ELABORACAO",
  "SEGUNDA_REUNIAO_AGENDADA",
  "CONSULTORIA_CONCLUIDA",
  "AGUARDANDO_DECISAO",
  "ATIVO_APLICATIVO",
  "ATIVO_ACOMPANHAMENTO",
] as const;
export type PfStatus = (typeof PF_STATUSES)[number];

export const PF_STATUS_LABEL: Record<PfStatus, string> = {
  NOVO_INTERESSADO: "Novo interessado",
  AGUARDANDO_CONTRATACAO: "Aguardando contratação",
  CONTRATACAO_CONFIRMADA: "Contratação confirmada",
  AGUARDANDO_DIAGNOSTICO: "Aguardando diagnóstico",
  DIAGNOSTICO_EM_PREPARACAO: "Diagnóstico em preparação",
  PRIMEIRA_REUNIAO_AGENDADA: "Primeira reunião agendada",
  DIAGNOSTICO_REALIZADO: "Diagnóstico realizado",
  PLANEJAMENTO_EM_ELABORACAO: "Planejamento em elaboração",
  SEGUNDA_REUNIAO_AGENDADA: "Segunda reunião agendada",
  CONSULTORIA_CONCLUIDA: "Consultoria concluída",
  AGUARDANDO_DECISAO: "Aguardando decisão de continuidade",
  ATIVO_APLICATIVO: "Cliente ativo — aplicativo",
  ATIVO_ACOMPANHAMENTO: "Cliente ativo — acompanhamento mensal",
};

export const PF_CONTINUITY = ["SEGUIR_SOZINHO", "ACOMPANHAMENTO_MENSAL"] as const;
export type PfContinuity = (typeof PF_CONTINUITY)[number];
export const PF_CONTINUITY_LABEL: Record<PfContinuity, string> = {
  SEGUIR_SOZINHO: "Opção A — seguir sozinho com o ROSAN LIFE",
  ACOMPANHAMENTO_MENSAL: "Opção B — Acompanhamento Financeiro Mensal",
};

export interface PfStage {
  n: number;
  name: string;
  /** Status do sistema ao concluir a etapa. */
  doneStatus: PfStatus;
  /** Entrega ao cliente, quando houver. */
  deliverable?: string;
  items: string[];
}

export const PF_STAGES: PfStage[] = [
  { n: 1, name: "Novo interessado", doneStatus: "AGUARDANDO_CONTRATACAO", items: ["Primeiro contato (WhatsApp, Instagram ou indicação)", "Identificar a necessidade", "Apresentar a consultoria", "Enviar a proposta"] },
  { n: 2, name: "Contratação confirmada", doneStatus: "CONTRATACAO_CONFIRMADA", items: ["Aceite do cliente", "Formalização", "Confirmar o pagamento", "Cadastrar no sistema administrativo"] },
  { n: 3, name: "Boas-vindas e onboarding", doneStatus: "AGUARDANDO_DIAGNOSTICO", items: ["Enviar mensagem de boas-vindas", "Enviar o formulário de diagnóstico", "Solicitar as informações necessárias", "Liberar o acesso ao ROSAN LIFE", "Agendar a primeira reunião"] },
  { n: 4, name: "Preparação do diagnóstico", doneStatus: "PRIMEIRA_REUNIAO_AGENDADA", items: ["Conferir as respostas do formulário", "Analisar receitas e despesas", "Analisar cartões e dívidas", "Preparar os pontos da reunião"] },
  { n: 5, name: "Primeira reunião — diagnóstico financeiro", doneStatus: "DIAGNOSTICO_REALIZADO", deliverable: "Raio-X Financeiro Pessoal", items: ["Realizar a reunião 1 de 2", "Entregar o Raio-X Financeiro Pessoal"] },
  { n: 6, name: "Construção do planejamento", doneStatus: "SEGUNDA_REUNIAO_AGENDADA", deliverable: "Planejamento Financeiro Mensal", items: ["Montar o orçamento mensal", "Definir limites por categoria", "Definir prioridades", "Definir reserva e metas", "Montar o plano de ação", "Agendar a segunda reunião"] },
  { n: 7, name: "Segunda reunião — apresentação do planejamento", doneStatus: "CONSULTORIA_CONCLUIDA", items: ["Realizar a reunião 2 de 2", "Ensinar a usar o ROSAN LIFE"] },
  { n: 8, name: "Encerramento", doneStatus: "AGUARDANDO_DECISAO", items: ["Enviar o resumo final", "Confirmar os 30 dias", "Apresentar as opções de continuidade", "Informar os 3 meses gratuitos do aplicativo"] },
  { n: 9, name: "Definição da continuidade", doneStatus: "ATIVO_APLICATIVO", items: ["Registrar a opção escolhida pelo cliente"] },
  { n: 10, name: "Acompanhamento pós-consultoria", doneStatus: "ATIVO_APLICATIVO", items: ["Acompanhar a assinatura do aplicativo ou os encontros e pagamentos mensais", "Manter o histórico do cliente"] },
];

export const itemKey = (stage: number, i: number) => `${stage}.${i}`;

/** Etapa atual a partir do status. */
export function stageOfStatus(s: PfStatus): number {
  switch (s) {
    case "NOVO_INTERESSADO": case "AGUARDANDO_CONTRATACAO": return 1;
    case "CONTRATACAO_CONFIRMADA": return 3;
    case "AGUARDANDO_DIAGNOSTICO": return 3;
    case "DIAGNOSTICO_EM_PREPARACAO": case "PRIMEIRA_REUNIAO_AGENDADA": return 4;
    case "DIAGNOSTICO_REALIZADO": return 6;
    case "PLANEJAMENTO_EM_ELABORACAO": case "SEGUNDA_REUNIAO_AGENDADA": return 6;
    case "CONSULTORIA_CONCLUIDA": return 8;
    case "AGUARDANDO_DECISAO": return 9;
    case "ATIVO_APLICATIVO": case "ATIVO_ACOMPANHAMENTO": return 10;
  }
}

/** Soma dias a uma data YYYY-MM-DD (sem fuso). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Prazos derivados: fim dos 30 dias (início + 30) e fim do bônus de 3 meses do app. */
export function pfDeadlines(p: { startDate?: string | null; appBonusStart?: string | null }) {
  return {
    endDate: p.startDate ? addDaysIso(p.startDate, 30) : null,
    appBonusEnd: p.appBonusStart ? addMonthsIso(p.appBonusStart, 3) : null,
  };
}

/** Consistência: opção B exige acompanhamento; status ativo exige continuidade. */
export function statusForContinuity(c: PfContinuity): PfStatus {
  return c === "ACOMPANHAMENTO_MENSAL" ? "ATIVO_ACOMPANHAMENTO" : "ATIVO_APLICATIVO";
}
