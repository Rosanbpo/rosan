import type { CompetenceRule, Frequency, JourneyStage, Priority, TaskCategory } from "./enums";

export interface LibraryTemplate {
  name: string;
  title: string;
  category: TaskCategory;
  stage: JourneyStage;
  priority?: Priority;
  frequency: Frequency;
  /** 0 = domingo … 6 = sábado (frequência semanal). */
  weekdays?: number[];
  monthDays?: number[];
  nthBusinessDay?: number;
  dueTime?: string;
  minutes: number;
  competence?: CompetenceRule;
  items: string[];
}

const D = "DAILY_BUSINESS" as const;
const W = "WEEKLY" as const;
const M = "MONTHLY_DAY" as const;
const N = "MONTHLY_NTH_BUSINESS_DAY" as const;

/** Biblioteca de modelos prontos de rotina de BPO financeiro (importável com um clique). */
export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // Operacional — diárias
  { name: "Conferência bancária matinal", title: "Conferência bancária matinal", category: "CONCILIACAO_BANCARIA", stage: "OPERACIONAL", frequency: D, dueTime: "10:00", minutes: 30, items: ["Conferir saldo de todas as contas", "Verificar movimentações do dia anterior", "Avisar o cliente sobre saldo baixo"] },
  { name: "Conciliação bancária diária", title: "Conciliação bancária diária", category: "CONCILIACAO_BANCARIA", stage: "OPERACIONAL", frequency: D, dueTime: "17:00", minutes: 45, items: ["Importar o extrato", "Conciliar os lançamentos", "Anotar pendências para o cliente"] },
  { name: "Baixa de recebimentos", title: "Registrar recebimentos e dar baixa", category: "CONTAS_A_RECEBER", stage: "OPERACIONAL", frequency: D, dueTime: "16:00", minutes: 30, items: ["Conferir Pix, boletos e cartões recebidos", "Lançar as baixas"] },
  { name: "Lançamento de documentos do cliente", title: "Lançar notas, boletos e comprovantes", category: "DOCUMENTACAO", stage: "OPERACIONAL", frequency: D, dueTime: "17:00", minutes: 40, items: ["Lançar documentos recebidos", "Cobrar documentos ilegíveis ou faltando"] },
  { name: "Atendimento de dúvidas do cliente", title: "Responder dúvidas e solicitações do cliente", category: "RELACIONAMENTO", stage: "OPERACIONAL", frequency: D, dueTime: "12:00", minutes: 20, items: ["Responder mensagens pendentes", "Registrar solicitações em tarefas"] },
  // Operacional — semanais
  { name: "Lista de pagamentos para aprovação", title: "Enviar a lista de pagamentos para aprovação", category: "CONTAS_A_PAGAR", stage: "OPERACIONAL", frequency: W, weekdays: [1], dueTime: "12:00", minutes: 45, priority: "ALTA", items: ["Listar contas dos próximos dias", "Enviar ao cliente", "Registrar a aprovação"] },
  { name: "Agendamento de pagamentos", title: "Agendar os pagamentos aprovados", category: "CONTAS_A_PAGAR", stage: "OPERACIONAL", frequency: W, weekdays: [2, 4], dueTime: "17:00", minutes: 60, items: ["Agendar no banco", "Anexar comprovantes", "Dar baixa nos lançamentos"] },
  { name: "Emissão de notas fiscais", title: "Emitir notas fiscais de serviço", category: "EMISSAO_NF", stage: "OPERACIONAL", frequency: W, weekdays: [1, 3, 5], dueTime: "16:00", minutes: 45, items: ["Conferir serviços prestados", "Emitir e enviar as notas"] },
  { name: "Cobrança de inadimplentes", title: "Cobrar clientes em atraso", category: "COBRANCA", stage: "OPERACIONAL", frequency: W, weekdays: [2, 4], dueTime: "16:00", minutes: 45, items: ["Atualizar a lista de atrasos", "Enviar mensagens de cobrança", "Registrar promessas de pagamento"] },
  { name: "Atualização do fluxo de caixa", title: "Atualizar o fluxo de caixa projetado", category: "FLUXO_DE_CAIXA", stage: "OPERACIONAL", frequency: W, weekdays: [5], dueTime: "16:00", minutes: 45, items: ["Atualizar entradas e saídas", "Avisar sobre risco de falta de caixa"] },
  { name: "Conferência de cartões de crédito", title: "Conferir faturas e lançamentos de cartão", category: "CONCILIACAO_BANCARIA", stage: "OPERACIONAL", frequency: W, weekdays: [3], dueTime: "17:00", minutes: 40, items: ["Lançar as compras do cartão", "Categorizar gastos", "Conferir a fatura aberta"] },
  // Operacional — mensais
  { name: "Conciliação mensal completa", title: "Conciliar todas as contas do mês", category: "FECHAMENTO_MENSAL", stage: "OPERACIONAL", frequency: N, nthBusinessDay: 2, minutes: 120, competence: "PREVIOUS_MONTH", priority: "ALTA", items: ["Conferir saldo de cada conta", "Conciliar cartões", "Resolver lançamentos sem categoria"] },
  { name: "Conferência de documentos do mês", title: "Conferir documentos do mês com o cliente", category: "DOCUMENTACAO", stage: "OPERACIONAL", frequency: N, nthBusinessDay: 3, minutes: 60, competence: "PREVIOUS_MONTH", items: ["Notas e comprovantes completos", "Cobrar o que falta"] },
  { name: "Fechamento mensal", title: "Fechar o mês no sistema", category: "FECHAMENTO_MENSAL", stage: "OPERACIONAL", frequency: N, nthBusinessDay: 4, minutes: 30, competence: "PREVIOUS_MONTH", priority: "ALTA", items: ["Revisão por outro analista", "Bloquear o mês", "Avisar o cliente"] },
  { name: "DRE gerencial", title: "Montar o DRE gerencial", category: "RELATORIOS_GERENCIAIS", stage: "OPERACIONAL", frequency: N, nthBusinessDay: 5, minutes: 90, competence: "PREVIOUS_MONTH", items: ["Conferir receitas e despesas por categoria", "Comparar com o mês anterior", "Escrever os comentários"] },
  { name: "Relatório gerencial mensal", title: "Enviar o relatório gerencial ao cliente", category: "RELATORIOS_GERENCIAIS", stage: "OPERACIONAL", frequency: N, nthBusinessDay: 6, minutes: 60, competence: "PREVIOUS_MONTH", items: ["DRE e fluxo de caixa", "Indicadores principais", "Enviar e confirmar o recebimento"] },
  { name: "Conferência de impostos e guias", title: "Conferir guias de impostos do mês", category: "CONTAS_A_PAGAR", stage: "OPERACIONAL", frequency: M, monthDays: [10], minutes: 40, items: ["Receber as guias do contador", "Lançar no contas a pagar", "Confirmar o vencimento com o cliente"] },
  { name: "Folha de pagamento e encargos", title: "Lançar folha de pagamento e encargos", category: "CONTAS_A_PAGAR", stage: "OPERACIONAL", frequency: M, monthDays: [3], minutes: 45, items: ["Conferir valores com o cliente", "Lançar e agendar o pagamento"] },
  { name: "Faturamento mensal de clientes do cliente", title: "Gerar o faturamento mensal", category: "CONTAS_A_RECEBER", stage: "OPERACIONAL", frequency: M, monthDays: [1], minutes: 60, items: ["Gerar cobranças recorrentes", "Enviar boletos e notas"] },
  // Estratégico
  { name: "Análise de indicadores", title: "Analisar os indicadores do mês", category: "ESTRATEGICO", stage: "ESTRATEGICO", frequency: N, nthBusinessDay: 7, minutes: 90, competence: "PREVIOUS_MONTH", items: ["Receita, margem e despesas", "Desvios relevantes", "Recomendações"] },
  { name: "Vazamentos de caixa", title: "Procurar vazamentos de caixa", category: "ESTRATEGICO", stage: "ESTRATEGICO", frequency: M, monthDays: [15], minutes: 60, items: ["Despesas fora do padrão", "Cobranças duplicadas", "Oportunidades de renegociação"] },
  { name: "Projeção de caixa de 90 dias", title: "Projetar o caixa dos próximos 90 dias", category: "FLUXO_DE_CAIXA", stage: "ESTRATEGICO", frequency: M, monthDays: [20], minutes: 90, items: ["Cenário base e pessimista", "Necessidade de capital de giro"] },
  { name: "Reunião mensal de resultados", title: "Reunião de resultados com o cliente", category: "REUNIAO_CLIENTE", stage: "ESTRATEGICO", frequency: N, nthBusinessDay: 8, minutes: 60, priority: "ALTA", items: ["Apresentar os resultados", "Registrar decisões", "Definir plano de ação"] },
  // Acompanhamento
  { name: "Check-in de relacionamento", title: "Check-in de relacionamento com o cliente", category: "RELACIONAMENTO", stage: "ACOMPANHAMENTO", frequency: M, monthDays: [12], minutes: 20, items: ["Contato proativo", "Registrar a percepção do cliente"] },
  { name: "Health score do cliente", title: "Avaliar o health score do cliente", category: "RELACIONAMENTO", stage: "ACOMPANHAMENTO", frequency: M, monthDays: [25], minutes: 30, items: ["Pontualidade nos envios", "Atrasos e retrabalho", "Engajamento"] },
  { name: "Risco de cancelamento", title: "Avaliar risco de cancelamento", category: "RELACIONAMENTO", stage: "ACOMPANHAMENTO", frequency: M, monthDays: [26], minutes: 30, items: ["Sinais de insatisfação", "Mensalidade em atraso", "Plano de recuperação"] },
  { name: "Pesquisa de satisfação (NPS)", title: "Enviar pesquisa de satisfação", category: "RELACIONAMENTO", stage: "ACOMPANHAMENTO", frequency: M, monthDays: [28], minutes: 30, items: ["Enviar a pesquisa", "Registrar a nota", "Responder notas baixas"] },
  { name: "Cobrança da mensalidade do BPO", title: "Cobrar a mensalidade do serviço", category: "COBRANCA", stage: "ACOMPANHAMENTO", frequency: M, monthDays: [5], minutes: 20, items: ["Conferir pagamento", "Cobrar se estiver em atraso"] },
  // Comercial
  { name: "Follow-up de proposta", title: "Fazer follow-up de proposta enviada", category: "RELACIONAMENTO", stage: "COMERCIAL", frequency: W, weekdays: [2, 4], minutes: 20, items: ["Ligar ou mandar mensagem", "Registrar o retorno no CRM"] },
];
