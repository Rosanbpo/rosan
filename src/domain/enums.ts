// Enums do domínio espelhados do schema Prisma como literais, para que as
// regras puras e os componentes de cliente não dependam do Prisma Client.

export const ROLES = ["ADMIN", "GESTOR", "OPERADOR"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
};

export const CLIENT_STATUSES = ["IMPLANTACAO", "ATIVO", "PAUSADO", "ENCERRADO"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  IMPLANTACAO: "Implantação",
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  ENCERRADO: "Encerrado",
};

export const TASK_CATEGORIES = [
  "CONTAS_A_PAGAR",
  "CONTAS_A_RECEBER",
  "CONCILIACAO_BANCARIA",
  "COBRANCA",
  "FLUXO_DE_CAIXA",
  "DOCUMENTACAO",
  "FECHAMENTO_MENSAL",
  "RELATORIOS_GERENCIAIS",
  "REUNIAO_CLIENTE",
  "IMPLANTACAO",
  "OUTRAS",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  CONTAS_A_PAGAR: "Contas a pagar",
  CONTAS_A_RECEBER: "Contas a receber",
  CONCILIACAO_BANCARIA: "Conciliação bancária",
  COBRANCA: "Cobrança",
  FLUXO_DE_CAIXA: "Fluxo de caixa",
  DOCUMENTACAO: "Documentação",
  FECHAMENTO_MENSAL: "Fechamento mensal",
  RELATORIOS_GERENCIAIS: "Relatórios gerenciais",
  REUNIAO_CLIENTE: "Reunião com cliente",
  IMPLANTACAO: "Implantação",
  OUTRAS: "Outras",
};

export const PRIORITIES = ["BAIXA", "NORMAL", "ALTA", "CRITICA"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  BAIXA: "Baixa",
  NORMAL: "Normal",
  ALTA: "Alta",
  CRITICA: "Crítica",
};
export const PRIORITY_WEIGHT: Record<Priority, number> = { BAIXA: 0, NORMAL: 1, ALTA: 2, CRITICA: 3 };

export const TASK_STATUSES = [
  "A_FAZER",
  "EM_ANDAMENTO",
  "AGUARDANDO_CLIENTE",
  "AGUARDANDO_TERCEIRO",
  "EM_REVISAO",
  "CONCLUIDA",
  "CANCELADA",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  A_FAZER: "A fazer",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  AGUARDANDO_TERCEIRO: "Aguardando terceiro",
  EM_REVISAO: "Em revisão",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};
export const CLOSED_STATUSES: readonly TaskStatus[] = ["CONCLUIDA", "CANCELADA"];
export const OPEN_STATUSES: readonly TaskStatus[] = TASK_STATUSES.filter(
  (s) => !CLOSED_STATUSES.includes(s),
);
export const WAITING_STATUSES: readonly TaskStatus[] = ["AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO"];

export const FREQUENCIES = [
  "DAILY_BUSINESS",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY_DAY",
  "MONTHLY_NTH_BUSINESS_DAY",
] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY_BUSINESS: "Diária (dias úteis)",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal (duas datas no mês)",
  MONTHLY_DAY: "Mensal (dia fixo)",
  MONTHLY_NTH_BUSINESS_DAY: "Mensal (enésimo dia útil)",
};

export const NON_BUSINESS_RULES = ["ANTICIPATE", "POSTPONE"] as const;
export type NonBusinessDayRule = (typeof NON_BUSINESS_RULES)[number];
export const NON_BUSINESS_RULE_LABEL: Record<NonBusinessDayRule, string> = {
  ANTICIPATE: "Antecipar para o dia útil anterior",
  POSTPONE: "Postergar para o próximo dia útil",
};

export const COMPETENCE_RULES = ["NONE", "CURRENT_MONTH", "PREVIOUS_MONTH"] as const;
export type CompetenceRule = (typeof COMPETENCE_RULES)[number];
export const COMPETENCE_RULE_LABEL: Record<CompetenceRule, string> = {
  NONE: "Sem competência",
  CURRENT_MONTH: "Mês do prazo",
  PREVIOUS_MONTH: "Mês anterior ao prazo",
};

export const PENDING_TYPE_LABEL = { CLIENTE: "Cliente", TERCEIRO: "Terceiro" } as const;

export const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const SERVICE_OPTIONS = [
  "Contas a pagar",
  "Contas a receber",
  "Conciliação bancária",
  "Cobrança",
  "Fluxo de caixa",
  "Fechamento mensal",
  "Relatórios gerenciais",
  "Emissão de notas fiscais",
  "Gestão de documentos",
] as const;
