import type { TaskCategory } from "./enums";

export interface ImplantationStep {
  phase: string;
  title: string;
  category: TaskCategory;
  /** Dias corridos após o início da implantação. */
  offsetDays: number;
  estimatedMinutes: number;
  description?: string;
}

/** Roteiro padrão de implantação de um cliente novo de BPO financeiro. */
export const IMPLANTATION_STEPS: ImplantationStep[] = [
  { phase: "1. Início", title: "Reunião de kickoff com o cliente", category: "REUNIAO_CLIENTE", offsetDays: 0, estimatedMinutes: 60, description: "Alinhar escopo, rotina, canais de contato e prazos de envio de documentos." },
  { phase: "1. Início", title: "Conferir contrato assinado e dados cadastrais", category: "DOCUMENTACAO", offsetDays: 1, estimatedMinutes: 30 },
  { phase: "1. Início", title: "Receber acessos: bancos, cartões e sistemas", category: "DOCUMENTACAO", offsetDays: 3, estimatedMinutes: 45, description: "Combinar o nível de acesso (consulta ou operação) e registrar quem autoriza pagamentos." },
  { phase: "1. Início", title: "Receber documentos da empresa e extratos dos últimos 3 meses", category: "DOCUMENTACAO", offsetDays: 3, estimatedMinutes: 45 },
  { phase: "2. Diagnóstico", title: "Mapear o processo financeiro atual do cliente", category: "IMPLANTACAO", offsetDays: 6, estimatedMinutes: 120, description: "Como o cliente recebe, paga, cobra e controla o caixa hoje; onde estão os gargalos." },
  { phase: "2. Diagnóstico", title: "Levantar contas a pagar em aberto", category: "CONTAS_A_PAGAR", offsetDays: 7, estimatedMinutes: 90 },
  { phase: "2. Diagnóstico", title: "Levantar contas a receber em aberto", category: "CONTAS_A_RECEBER", offsetDays: 7, estimatedMinutes: 90 },
  { phase: "2. Diagnóstico", title: "Levantar saldos iniciais de contas e cartões", category: "CONCILIACAO_BANCARIA", offsetDays: 8, estimatedMinutes: 45 },
  { phase: "3. Configuração", title: "Cadastrar plano de contas, categorias e centros de custo", category: "IMPLANTACAO", offsetDays: 10, estimatedMinutes: 120 },
  { phase: "3. Configuração", title: "Cadastrar fornecedores e clientes", category: "IMPLANTACAO", offsetDays: 11, estimatedMinutes: 120 },
  { phase: "3. Configuração", title: "Lançar contas em aberto e conferir com o cliente", category: "CONTAS_A_PAGAR", offsetDays: 13, estimatedMinutes: 120 },
  { phase: "3. Configuração", title: "Conciliar o último mês fechado", category: "CONCILIACAO_BANCARIA", offsetDays: 15, estimatedMinutes: 120 },
  { phase: "4. Rotina", title: "Definir calendário de pagamentos e alçadas de aprovação", category: "REUNIAO_CLIENTE", offsetDays: 16, estimatedMinutes: 60 },
  { phase: "4. Rotina", title: "Vincular as rotinas recorrentes ao cliente", category: "IMPLANTACAO", offsetDays: 17, estimatedMinutes: 30, description: "Em Rotinas → Recorrências, vincular os modelos e definir responsável e revisor." },
  { phase: "4. Rotina", title: "Montar o primeiro fluxo de caixa projetado", category: "FLUXO_DE_CAIXA", offsetDays: 20, estimatedMinutes: 90 },
  { phase: "4. Rotina", title: "Reunião de validação e entrega da implantação", category: "REUNIAO_CLIENTE", offsetDays: 24, estimatedMinutes: 60 },
  { phase: "4. Rotina", title: "Entregar o primeiro relatório gerencial", category: "RELATORIOS_GERENCIAIS", offsetDays: 30, estimatedMinutes: 120 },
];

/** Dias de implantação: o prazo final do projeto é o da última etapa. */
export const IMPLANTATION_DAYS = Math.max(...IMPLANTATION_STEPS.map((s) => s.offsetDays));
