/**
 * Planos de BPO Financeiro da Rosan Finanças, baseados na planilha de precificação
 * (abas "Ex. Plano Básico / Intermediário / Avançado"). Os valores são sugestões
 * editáveis: cada proposta pode ajustar escopo, limites e mensalidade.
 *
 * Formato dos itens: "Título | Descrição" (serviços) e "Descrição | Limite" (volumes).
 */
export interface PlanPreset {
  key: "BASICO" | "INTERMEDIARIO" | "AVANCADO" | "PERSONALIZADO";
  name: string;
  audience: string;
  suggestedFee: number | null;
  services: string[];
  volumes: string[];
}

const BASE_SERVICES = [
  "Contas a pagar | Lançamento e controle de vencimentos de fornecedores e prestadores.",
  "Contas a receber | Controle e lançamento de todos os recebimentos.",
  "Conciliação bancária | Importação de extratos e conferência dos lançamentos.",
  "Emissão de notas fiscais | Emissão conforme a demanda mensal informada.",
  "Emissão de boletos de cobrança | Geração dos boletos para os seus clientes.",
  "Controle de cartão | Lançamento e controle das faturas de cartão.",
  "Relatórios financeiros | DRE gerencial e fluxo de caixa mensal.",
  "Reunião de análise de resultados | Encontro mensal para apresentar e discutir os números.",
];

export const EXCLUSIONS_DEFAULT = [
  "Negociação com terceiros em nome da contratante",
  "Tomada de decisões gerenciais",
  "Controle de caixa físico",
  "Obrigações fiscais acessórias (SPED, EFD, DCTF), salvo se previstas em aditivo contratual",
];

export const PLAN_PRESETS: PlanPreset[] = [
  {
    key: "BASICO",
    name: "Plano Básico",
    audience: "MEIs e microempresas com pequeno volume de transações mensais, ou que desejam terceirizar apenas o contas a receber.",
    suggestedFee: 500,
    services: BASE_SERVICES,
    volumes: [
      "Notas fiscais por mês | até 10",
      "Boletos de cobrança | até 20",
      "Contas bancárias monitoradas | até 2",
      "Fatura de cartão (PF/PJ) | até 1",
      "Lançamentos (pagamentos e recebimentos) | até 50",
    ],
  },
  {
    key: "INTERMEDIARIO",
    name: "Plano Intermediário",
    audience: "Pequenas e médias empresas com volume considerável de transações e rotina padronizada.",
    suggestedFee: 1000,
    services: [
      ...BASE_SERVICES,
      "Agendamento bancário | Programação dos pagamentos nas contas da empresa.",
      "Controle de aplicações | Acompanhamento de ganhos e perdas das aplicações financeiras.",
    ],
    volumes: [
      "Notas fiscais por mês | até 100",
      "Boletos de cobrança | ilimitado",
      "Contas bancárias monitoradas | até 4",
      "Faturas de cartão (PF/PJ) | até 5",
      "Agendamentos bancários | até 200",
      "Lançamentos (pagamentos e recebimentos) | até 200",
      "Aplicações financeiras | até 3",
    ],
  },
  {
    key: "AVANCADO",
    name: "Plano Avançado",
    audience: "Pequenas e médias empresas com alto volume de transações e necessidade de personalização e acompanhamento estratégico.",
    suggestedFee: 1500,
    services: [
      ...BASE_SERVICES,
      "Agendamento bancário | Programação dos pagamentos nas contas da empresa.",
      "Controle de aplicações | Acompanhamento de ganhos e perdas das aplicações financeiras.",
      "Vídeo mensal de resultados | Apresentação gravada dos números do mês.",
      "Indicadores de performance | Painel de indicadores acompanhado mês a mês.",
      "Planejamento estratégico | Plano financeiro construído junto com a sua gestão.",
    ],
    volumes: [
      "Notas fiscais por mês | até 100",
      "Boletos de cobrança | ilimitado",
      "Contas bancárias monitoradas | até 4",
      "Faturas de cartão (PF/PJ) | até 5",
      "Agendamentos bancários | até 200",
      "Lançamentos (pagamentos e recebimentos) | até 200",
      "Aplicações financeiras | até 3",
      "Vídeo mensal de resultados | 1",
      "Indicadores de performance | 3",
      "Planejamento estratégico | 1",
    ],
  },
  {
    key: "PERSONALIZADO",
    name: "Plano Personalizado",
    audience: "Escopo desenhado sob medida para a necessidade da empresa.",
    suggestedFee: null,
    services: [],
    volumes: [],
  },
];

export function findPlan(name: string): PlanPreset | undefined {
  return PLAN_PRESETS.find((p) => p.name === name);
}
