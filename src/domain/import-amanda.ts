/**
 * Importação única do quadro do Trello "Operacional clientes BPO" (BPO prestado
 * para o escritório Amanda Finanças). Cada cliente da Amanda vira um cliente no
 * sistema, e cada cartão vira uma rotina com o checklist e as observações.
 */
import type { TaskCategory } from "./enums";

export const PARENT_NAME = "Amanda Finanças";
export const PREFIX = "Amanda › ";
export const FEE_PER_CLIENT = 240;
export const BILLING_DAY = 20;
export const PARENT_TOTAL_FEE = 1200;

export interface ImportClient {
  key: string;
  name: string;
  software: string;
  banks: string;
}
export const CLIENTS: ImportClient[] = [
  { key: "lila", name: "Studio Lila França", software: "Avec", banks: "Sicoob (2 contas); cartões Inter e Banco do Brasil" },
  { key: "sabrina", name: "Sabrina Rodrigues", software: "Evas", banks: "Santander; cartão Itaú" },
  { key: "nayane", name: "Dra Nayane", software: "Clinicorp", banks: "Sicoob (conta PF 16022); cartões Sicoob PF e Caixa Econômica" },
  { key: "elitecar", name: "EliteCar", software: "E-gestor", banks: "Santander" },
  { key: "alcance", name: "Alcance Mídia", software: "Meu dinheiro Web", banks: "Stone" },
];

export interface ImportRoutine {
  client: string; // key ou "parent"
  title: string;
  source: string; // cartão do Trello
  category: TaskCategory;
  mode: "DAILY" | "WEEKLY" | "MONTHLY";
  weekday?: number; // 1 = segunda ... 5 = sexta
  monthDay?: number;
  dueTime: string;
  startDate?: string; // AAAA-MM-DD; padrão = hoje
  description?: string;
  checklist: string[];
  /** Itens já marcados como feitos hoje no Trello. */
  doneToday?: string[];
  /** Lista do Trello em que o cartão está hoje (A fazer = A_FAZER, Fazendo = EM_ANDAMENTO). */
  statusToday?: "A_FAZER" | "EM_ANDAMENTO";
}

const MSG_COBRANCA = `Olá! Tudo bem? 😊

Aqui é da assessoria financeira da Alcance Mídia.

Passando para lembrar que o vencimento do seu pagamento referente aos serviços contratados no valor de **xxxx**  está se aproximando/**é hoje**. Esse é apenas um lembrete para ajudar na organização dos seus pagamentos.

Chave Pix (CNPJ): 54152678000119

Caso o pagamento já tenha sido realizado, por favor, desconsidere esta mensagem. 😊

Se tiver qualquer dúvida, estamos à disposição!`;

const MSG_NAYANE = `**Dados a solicitar Dra Nayane:**

Bom dia pessoal!

Assim que possível nos enviar:

- Relação faturamento Uniodonto
- Extrato bancário conta Sicoob PF 16022
- Fatura cartão de crédito Sicoob PF e Caixa econômica`;

const DAILY_START = "Demanda diária";

export const ROUTINES: ImportRoutine[] = [
  // ---------- Demandas diárias (A fazer, Fazendo, Concluído): todo dia útil ----------
  {
    client: "lila",
    title: DAILY_START,
    source: "Demanda diária Studio - Lila França",
    category: "CONCILIACAO_BANCARIA",
    mode: "DAILY",
    dueTime: "12:00",
    statusToday: "A_FAZER",
    checklist: [
      "Entrar no sistema do cliente - Avec",
      "Acessar banco - SICOOB (02 contas) Baixar OFX",
      "Verificar contas a pagar se foram pagas, ajustar valores planos de contas e fazer conciliação",
      "Atualizar contas a pagar",
      "Fazer conciliação bancária do dia anterior",
      "Verificar mensagens a serem respondidas - demandas",
      "Fazer relação do caixa do dia anterior e enviar no grupo",
      "Enviar relatório de movimentações financeiras",
    ],
    doneToday: ["Entrar no sistema do cliente - Avec"],
  },
  {
    client: "sabrina",
    title: DAILY_START,
    source: "Demanda diária - Sabrina Rodrigues",
    category: "CONCILIACAO_BANCARIA",
    mode: "DAILY",
    dueTime: "12:00",
    statusToday: "EM_ANDAMENTO",
    checklist: [
      "Entrar no sistema do cliente - Evas",
      "Acessar banco - Santander. Baixar OFX",
      "Verificar contas a pagar se foram pagas, ajustar valores planos de contas e fazer conciliação",
      "Atualizar contas a pagar - incluindo cartão de crédito",
      "Fazer conciliação bancária do dia anterior",
      "Verificar análises Eva (WPP) verificar se categorias e sub-catgeorias estão corretas e aceitar",
      "Verificar mensagens a serem respondidas - demandas",
    ],
    doneToday: [
      "Entrar no sistema do cliente - Evas",
      "Acessar banco - Santander. Baixar OFX",
      "Verificar contas a pagar se foram pagas, ajustar valores planos de contas e fazer conciliação",
      "Fazer conciliação bancária do dia anterior",
    ],
  },
  {
    client: "nayane",
    title: DAILY_START,
    source: "Demanda diária - Dra Nayane",
    category: "CONCILIACAO_BANCARIA",
    mode: "DAILY",
    dueTime: "12:00",
    statusToday: "EM_ANDAMENTO",
    checklist: [
      "Entrar no sistema do cliente - Clinicorp",
      "Acessar banco - SICOOB. Baixar OFX",
      "Lançamentos de entradas dentro da agenda do paciente - verificar com caderno caixa",
      'Após fazer o lançamento das entradas enviar mensagem de pendências  a verificar atualizada no grupo "Caixa". Ex: pacientes que estão inadimplentes',
      "Fazer conciliação bancária do dia anterior",
      "Atualizar contas a pagar",
      "Enviar relatório de movimentações financeiras - saídas não identificadas",
      "Verificar mensagens a serem respondidas - demandas",
      "Emissão de NF diária",
    ],
    doneToday: [
      "Entrar no sistema do cliente - Clinicorp",
      "Acessar banco - SICOOB. Baixar OFX",
      "Lançamentos de entradas dentro da agenda do paciente - verificar com caderno caixa",
      'Após fazer o lançamento das entradas enviar mensagem de pendências  a verificar atualizada no grupo "Caixa". Ex: pacientes que estão inadimplentes',
      "Fazer conciliação bancária do dia anterior",
      "Verificar mensagens a serem respondidas - demandas",
      "Emissão de NF diária",
    ],
  },
  {
    client: "elitecar",
    title: DAILY_START,
    source: "Demanda diária - EliteCar",
    category: "CONCILIACAO_BANCARIA",
    mode: "DAILY",
    dueTime: "12:00",
    statusToday: "EM_ANDAMENTO",
    checklist: [
      "Entrar no sistema do cliente - E-gestor",
      "Acessar banco - Santander. Baixar OFX",
      "Verificar contas a pagar se foram pagas, ajustar valores planos de contas e fazer conciliação",
      "Atualizar contas a pagar",
      "Fazer conciliação bancária do dia anterior",
      "Anexar arquivo contas no contas a pagar",
      "Verificar mensagens a serem respondidas - demandas",
    ],
    doneToday: [
      "Entrar no sistema do cliente - E-gestor",
      "Acessar banco - Santander. Baixar OFX",
      "Fazer conciliação bancária do dia anterior",
    ],
  },
  {
    client: "alcance",
    title: DAILY_START,
    source: "Demanda diária - Alcance Mídia",
    category: "CONCILIACAO_BANCARIA",
    mode: "DAILY",
    dueTime: "12:00",
    startDate: "2026-11-24", // no Trello o cartão está em Concluído, com vencimento amanhã
    checklist: [
      "Entrar no sistema do cliente - Meu dinheiro Web",
      "Acessar banco - Stone. Baixar OFX",
      "Verificar contas a pagar se foram pagas, ajustar valores planos de contas e fazer conciliação",
      "Atualizar contas a pagar - incluindo cartão de crédito",
      "Fazer conciliação bancária do dia anterior",
      "Anexar arquivo contas no contas a pagar",
      "Verificar mensagens a serem respondidas - demandas",
      "Enviar mensagem cobranças clientes",
    ],
  },

  // ---------- Demandas gerais semana ----------
  {
    client: "lila",
    title: "Todas às segundas-feiras",
    source: "Todas ás segundas-feiras",
    category: "RELATORIOS_GERENCIAIS",
    mode: "WEEKLY",
    weekday: 1,
    dueTime: "18:00",
    checklist: [
      "Conferir fechamento de caixa da semana anterior e enviar atualizado",
      "Emitir e enviar grupo Studio Lila França comissão das profissionais",
      "Atualizar planilha de metas colaboradoras - enviar no grupo",
    ],
  },
  {
    client: "parent",
    title: "Todas às sextas-feiras",
    source: "Todas ás sextas-feiras",
    category: "FLUXO_DE_CAIXA",
    mode: "WEEKLY",
    weekday: 5,
    dueTime: "18:00",
    checklist: [
      "Conferência do fluxo de caixa da semana - todos",
      "Fazer fluxo de caixa da próxima semana - todos: contas a pagar - saldo atual do banco",
      "Enviar relatórios da previsão nos grupos - todos",
    ],
  },

  // ---------- Demandas gerais mês ----------
  {
    client: "parent",
    title: "Todo dia 01",
    source: "Todo dia 01",
    category: "FECHAMENTO_MENSAL",
    mode: "MONTHLY",
    monthDay: 1,
    dueTime: "18:00",
    checklist: [
      "Enviar mensagem solicitando dados que estão faltando/ todos",
      "Entrar plataforma água/luz todos",
      "Ajustar e verificar contas a pagar do mês no sistema",
      "Enviar relatório faturamento mês anterior / todos - mensagem whatsapp",
      "Enviar relação contas a pagar do mês para todos",
    ],
  },
  {
    client: "nayane",
    title: "Todo dia 01",
    source: "Todo dia 01 (descrição do cartão: dados a solicitar da Dra Nayane)",
    category: "DOCUMENTACAO",
    mode: "MONTHLY",
    monthDay: 1,
    dueTime: "18:00",
    description: MSG_NAYANE,
    checklist: ["Relação faturamento Uniodonto", "Extrato bancário conta Sicoob PF 16022", "Fatura cartão de crédito Sicoob PF e Caixa econômica"],
  },
  {
    client: "sabrina",
    title: "Todo dia 03",
    source: "Todo dia 03",
    category: "DOCUMENTACAO",
    mode: "MONTHLY",
    monthDay: 3,
    dueTime: "18:00",
    checklist: ["Solicitar faturas cartão de crédito Itaú grupo Sabrina"],
  },
  {
    client: "parent",
    title: "Até dia 10",
    source: "Até dia 10",
    category: "RELATORIOS_GERENCIAIS",
    mode: "MONTHLY",
    monthDay: 10,
    dueTime: "18:00",
    checklist: ["Enviar no e-mail de todos relatórios do mês", "Mandar mensagem para agendar reunião do mês"],
  },
  {
    client: "lila",
    title: "Até dia 10",
    source: "Até dia 10 (item da Lila)",
    category: "RELATORIOS_GERENCIAIS",
    mode: "MONTHLY",
    monthDay: 10,
    dueTime: "18:00",
    checklist: ["Mandar relação de comissões contador - LILA (ao receber NFs colocar na pasta do drive do cliente)"],
  },
  {
    client: "lila",
    title: "Todo dia 13",
    source: "Todo dia 13",
    category: "DOCUMENTACAO",
    mode: "MONTHLY",
    monthDay: 13,
    dueTime: "18:00",
    checklist: ["Solicitar faturas cartão de crédito Inter - Grupo Studio Lila França"],
  },
  {
    client: "lila",
    title: "Todo dia 15",
    source: "Todo dia 15",
    category: "EMISSAO_NF",
    mode: "MONTHLY",
    monthDay: 15,
    dueTime: "18:00",
    checklist: ["Emitir NFs Studio Lila França"],
  },
  {
    client: "lila",
    title: "Todo dia 29",
    source: "Todo dia 29",
    category: "DOCUMENTACAO",
    mode: "MONTHLY",
    monthDay: 29,
    dueTime: "18:00",
    checklist: ["Solicitar faturas cartão de crédito Banco do Brasil- Grupo Studio Lila França"],
  },

  // ---------- Clientes Alcance Mídia - Cobranças ----------
  {
    client: "alcance",
    title: "Cobranças dia 5",
    source: "Dia 05",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 5,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: ["Leonardo Alves Ribeiro (64) 99203-7627 - R$950,00", "Mayara Azevedo (64)98124-3531 - R$2.100,00", "Hellen Carolina (64)99221-4975 - R$950,00"],
  },
  {
    client: "alcance",
    title: "Cobranças dia 10",
    source: "Dia 10",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 10,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: [
      "Ellen Moni  (64)8420-2020  - R$475,00",
      "Gabriela Moni (64) 9210-4493 - R$475,00",
      "Gleice / Du´sono (64)99907-2502 - R$1.000,00 (Enviar NF junto com a cobrança)",
      "Victor Soares (62)99228-2608 - R$950,00",
    ],
  },
  {
    client: "alcance",
    title: "Cobranças dia 15",
    source: "Dia 15",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 15,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: ["Érica Teles  - R$1.300,00 solicitar contato ", "Vinícius (64)99600-9626 -  R$1.680,00 Enviar NF junto com a cobrança"],
  },
  {
    client: "alcance",
    title: "Cobranças dia 16",
    source: "Dia 16",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 16,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: ["Nayane Alves - (64) 99233-6265 R$1.900,00 "],
  },
  {
    client: "alcance",
    title: "Cobranças dia 20",
    source: "Dia 20",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 20,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: ["Laila Crislei (64)99343-7580 - R$1.000,00", "Victor Soares (62)99228-2608 - R$1.050,00", "Cobrança antecipada p/  Wender Ferreira (64)99262-3604 - R$1.450,00"],
  },
  {
    client: "alcance",
    title: "Cobranças dia 26",
    source: "Dia 26",
    category: "COBRANCA",
    mode: "MONTHLY",
    monthDay: 26,
    dueTime: "12:00",
    description: MSG_COBRANCA,
    checklist: ["Wender Ferreira (64)99262-3604 - R$1.450,00"],
  },
];

export function clientTradeName(c: ImportClient) {
  return `${PREFIX}${c.name}`;
}
