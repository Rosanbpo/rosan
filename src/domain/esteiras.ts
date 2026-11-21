import { CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, TASK_CATEGORIES, type JourneyStage, type Priority, type TaskCategory } from "./enums";

export type Tone = "sky" | "teal" | "emerald" | "amber" | "indigo" | "violet" | "orange" | "slate" | "red";

export interface EsteiraTask {
  title: string;
  category: TaskCategory;
  /** Dias corridos após a data de início escolhida ao aplicar. */
  day: number;
  minutes: number;
  priority?: Priority;
  description?: string;
  /** Itens do checklist da tarefa. */
  items: string[];
}

export interface EsteiraStage {
  name: string;
  tasks: EsteiraTask[];
}

export interface Esteira {
  slug: string;
  name: string;
  stage: JourneyStage;
  tone: Tone;
  icon: "handshake" | "inbox" | "rocket" | "settings" | "repeat" | "lightbulb" | "heart" | "door" | "wallet";
  summary: string;
  stages: EsteiraStage[];
}

const t = (title: string, category: TaskCategory, day: number, minutes: number, items: string[], extra: Partial<EsteiraTask> = {}): EsteiraTask => ({
  title,
  category,
  day,
  minutes,
  items,
  ...extra,
});

/**
 * Esteiras: jornadas prontas do cliente de BPO financeiro, da venda ao encerramento.
 * Cada esteira tem etapas; cada etapa tem tarefas; cada tarefa tem um checklist.
 */
export const ESTEIRAS: Esteira[] = [
  {
    slug: "jornada-comercial",
    name: "Jornada comercial",
    stage: "COMERCIAL",
    tone: "sky",
    icon: "handshake",
    summary: "Do primeiro contato ao contrato assinado.",
    stages: [
      {
        name: "Prospecção e diagnóstico",
        tasks: [
          t("Primeiro contato com o lead", "RELACIONAMENTO", 0, 30, ["Registrar o lead no CRM", "Entender o porte e o segmento da empresa", "Agendar a reunião de diagnóstico"]),
          t("Reunião de diagnóstico financeiro", "REUNIAO_CLIENTE", 3, 60, ["Mapear como o financeiro funciona hoje", "Identificar as principais dores", "Levantar o volume mensal de lançamentos", "Saber quais sistemas a empresa usa"]),
          t("Levantar informações para a proposta", "DOCUMENTACAO", 4, 45, ["Quantidade de contas bancárias", "Volume de notas e boletos por mês", "Escopo desejado (pagar, receber, conciliar, relatórios)", "Quem aprova os pagamentos"]),
          t("Calcular o preço do serviço", "ESTRATEGICO", 5, 30, ["Rodar a precificação com o volume levantado", "Conferir a margem mínima", "Definir descontos possíveis"]),
        ],
      },
      {
        name: "Proposta e fechamento",
        tasks: [
          t("Enviar a proposta comercial", "RELACIONAMENTO", 6, 45, ["Gerar a proposta A4", "Enviar por e-mail ou WhatsApp", "Registrar o envio no CRM"]),
          t("Follow-up da proposta", "RELACIONAMENTO", 9, 20, ["Ligar ou mandar mensagem", "Responder dúvidas e objeções", "Registrar o retorno do lead"], { priority: "ALTA" }),
          t("Negociar e ajustar a proposta", "REUNIAO_CLIENTE", 12, 45, ["Revisar escopo e valor", "Reenviar a proposta ajustada"]),
          t("Fechar o contrato", "DOCUMENTACAO", 15, 40, ["Gerar o contrato", "Coletar a assinatura", "Converter o lead em cliente", "Avisar a equipe do início da operação"], { priority: "ALTA" }),
        ],
      },
    ],
  },
  {
    slug: "pre-onboarding",
    name: "Pré-onboarding",
    stage: "PRE_ONBOARDING",
    tone: "teal",
    icon: "inbox",
    summary: "Do contrato assinado ao cliente pronto para a reunião de onboarding. Prazos em dias a partir do contrato.",
    stages: [
      {
        name: "Venda e boas-vindas",
        tasks: [
          t("Handoff comercial → operação", "RELACIONAMENTO", 0, 30, ["Contrato", "Escopo", "Valores", "Volumes", "Particularidades", "Data prevista de início"]),
          t("Apresentar o responsável e enviar cronograma e checklist", "RELACIONAMENTO", 1, 30, ["Responsável apresentado ao cliente", "Cronograma enviado", "Checklist enviado", "Reunião de onboarding agendada"]),
        ],
      },
      {
        name: "Contrato e sistema",
        tasks: [
          t("Assinatura do contrato de prestação de serviços", "RELACIONAMENTO", 2, 30, ["Enviar o contrato para assinatura", "Confirmar a assinatura", "Arquivar o contrato assinado"]),
          t("Coleta do questionário de onboarding preenchido", "DOCUMENTACAO", 4, 30, ["Enviar o questionário ao cliente", "Cobrar o preenchimento", "Conferir as respostas"]),
          t("Definição do sistema de gestão financeira a usar", "IMPLANTACAO", 4, 30, ["Ver o que o cliente usa hoje", "Escolher o sistema", "Registrar a decisão"]),
          t("Criação de acesso ao sistema para o cliente", "IMPLANTACAO", 4, 20, ["Criar o usuário do cliente", "Enviar o login", "Confirmar o primeiro acesso"]),
          t("Alinhamento de regime tributário com o contador", "DOCUMENTACAO", 4, 30, ["Confirmar o regime (Simples, Presumido ou Real)", "Alinhar o contato do contador", "Registrar no cadastro do cliente"]),
        ],
      },
    ],
  },
  {
    slug: "onboarding",
    name: "Onboarding",
    stage: "ONBOARDING",
    tone: "emerald",
    icon: "rocket",
    summary: "Reunião de onboarding, coleta, validação e checklist antes do go-live. Prazos em dias a partir da reunião.",
    stages: [
      {
        name: "Reunião de onboarding",
        tasks: [
          t("Reunião de kick-off e onboarding", "REUNIAO_CLIENTE", 0, 90, ["Contas a pagar", "Contas a receber", "Bancos", "Cartões", "Faturamento", "Sistemas", "Contabilidade", "Pendências anteriores"]),
          t("Enviar o resumo da reunião", "RELACIONAMENTO", 0, 20, ["Resumo com os próximos passos", "Prazos e responsáveis registrados", "Enviado em até 2 horas"]),
        ],
      },
      {
        name: "Coleta",
        tasks: [
          t("Definir responsáveis e aprovadores", "ESTRATEGICO", 2, 30, ["Quem envia as informações", "Quem aprova os pagamentos", "Alçadas de aprovação", "Horário limite de envio"]),
          t("Coletar os acessos", "IMPLANTACAO", 3, 45, ["Extratos bancários", "Sistema financeiro ou ERP atual", "Plataformas de venda", "Procuração ou autorização, quando exigida"]),
          t("Coletar os documentos", "DOCUMENTACAO", 3, 45, ["Contratos vigentes", "Dados cadastrais completos", "Últimos fechamentos ou DRE", "Plano de contas atual"]),
          t("Separar implantação, rotina e saneamento", "ESTRATEGICO", 4, 45, ["Identificar o passivo anterior", "O que é implantação", "O que é rotina mensal", "O que é saneamento (cobrar à parte)"]),
        ],
      },
      {
        name: "Validação",
        tasks: [
          t("Validar responsabilidades e prazos", "RELACIONAMENTO", 6, 45, ["Responsabilidades combinadas", "Prazos combinados", "Aprovações definidas", "Pendências identificadas", "Equipe orientada"]),
          t("Checklist antes do go-live", "ESTRATEGICO", 7, 30, ["Tenho os acessos necessários?", "Tenho as informações necessárias?", "Sei exatamente o que foi contratado?", "Sei quem aprova?", "Sei os prazos?", "Sei como receber documentos?", "O cliente sabe suas responsabilidades?", "O BPO sabe suas responsabilidades?", "As pendências anteriores foram identificadas?", "A equipe sabe executar esse cliente?"]),
          t("Apresentar o manual de operação ao cliente", "RELACIONAMENTO", 7, 30, ["Enviar o manual de operação", "Explicar a rotina e o que o cliente faz", "Confirmar a ciência do cliente"]),
        ],
      },
    ],
  },
  {
    slug: "implantacao",
    name: "Implantação",
    stage: "IMPLANTACAO",
    tone: "indigo",
    icon: "settings",
    summary: "Cronograma de 5 semanas até a operação regular. Prazos em dias a partir do início da implantação.",
    stages: [
      {
        name: "Configuração do sistema",
        tasks: [
          t("Cadastro da empresa no sistema de gestão", "IMPLANTACAO", 6, 45, ["Dados da empresa", "Sócios e contatos", "Regime tributário"]),
          t("Configuração do plano de contas", "IMPLANTACAO", 6, 90, ["Montar o plano de contas", "Validar com o cliente"]),
          t("Cadastro de categorias de receita e despesa", "IMPLANTACAO", 6, 60, ["Categorias de receita", "Categorias de despesa", "Validar com o cliente"]),
          t("Conexão bancária (Open Finance ou extrato manual)", "IMPLANTACAO", 13, 60, ["Conectar os bancos", "Testar a importação", "Definir extrato manual onde não houver conexão"]),
          t("Importação do histórico financeiro (mínimo 3 meses)", "IMPLANTACAO", 13, 120, ["Receber extratos em PDF ou OFX", "Importar os 3 meses", "Conferir os saldos"]),
          t("Configuração de centro de custos (se aplicável)", "IMPLANTACAO", 13, 45, ["Definir os centros de custo", "Cadastrar no sistema"]),
          t("Configuração de contas a pagar recorrentes", "CONTAS_A_PAGAR", 13, 60, ["Listar as despesas recorrentes", "Cadastrar com vencimento e valor", "Validar com o cliente"]),
        ],
      },
      {
        name: "Organização financeira inicial",
        tasks: [
          t("Levantamento de todas as dívidas e obrigações", "ESTRATEGICO", 13, 90, ["Dívidas e empréstimos", "Impostos em aberto", "Contratos com parcelas"]),
          t("Organização do fluxo de caixa retroativo", "FLUXO_DE_CAIXA", 20, 120, ["Montar o histórico de entradas e saídas", "Conferir com os extratos"]),
          t("Identificação de despesas fixas e variáveis", "ESTRATEGICO", 20, 60, ["Separar fixas de variáveis", "Registrar no sistema"]),
          t("Conciliação bancária do período anterior", "CONCILIACAO_BANCARIA", 20, 120, ["Conciliar cada conta", "Listar divergências", "Validar com os extratos"]),
          t("Mapeamento de fontes de receita", "ESTRATEGICO", 20, 60, ["Listar as fontes de receita", "Formas e prazos de recebimento"]),
          t("Validação do DRE inicial com o cliente", "RELATORIOS_GERENCIAIS", 27, 60, ["Montar o DRE inicial", "Reunião de 30 minutos com o cliente", "Registrar os ajustes"]),
        ],
      },
      {
        name: "Treinamento e operação",
        tasks: [
          t("Treinamento do cliente no sistema (lançamentos básicos)", "RELACIONAMENTO", 20, 60, ["Treinamento ao vivo ou em vídeo", "Tirar dúvidas"]),
          t("Definição do dia e horário do relatório mensal", "RELACIONAMENTO", 20, 20, ["Combinar o dia de entrega", "Combinar o horário da reunião de análise"]),
          t("Alinhamento do processo de envio de documentos", "DOCUMENTACAO", 20, 30, ["Combinar o canal", "Combinar o dia da semana de envio"]),
          t("Primeiro relatório gerencial entregue e apresentado", "RELATORIOS_GERENCIAIS", 27, 120, ["DRE", "Fluxo de caixa", "Indicadores", "Apresentar ao cliente"]),
          t("Ajustes pós-primeiro relatório", "RELATORIOS_GERENCIAIS", 34, 60, ["Coletar o retorno do cliente", "Ajustar categorias e relatórios"]),
        ],
      },
      {
        name: "Validação e go-live",
        tasks: [
          t("Checagem final: todos os sistemas funcionando", "IMPLANTACAO", 34, 45, ["Acessos funcionando", "Conexões bancárias ativas", "Rotinas cadastradas"]),
          t("Aprovação formal do cliente (e-mail ou assinatura)", "RELACIONAMENTO", 34, 20, ["Enviar o pedido de aprovação", "Registrar a resposta do cliente"]),
          t("Briefing da rotina mensal acordada", "RELACIONAMENTO", 34, 45, ["Revisar a rotina com o cliente", "Confirmar dias e responsáveis"]),
          t("Implantação encerrada: operação regular iniciada", "IMPLANTACAO", 34, 30, ["As tarefas de onboarding foram concluídas", "A rotina do cliente está cadastrada, com cada serviço contratado", "Os modelos de rotina foram vinculados (geração automática das tarefas)", "O cliente entrou na operação normal"]),
        ],
      },
    ],
  },
  {
    slug: "rotina-operacional",
    name: "Rotina operacional",
    stage: "OPERACIONAL",
    tone: "violet",
    icon: "repeat",
    summary: "O dia a dia do BPO: conciliar, pagar, cobrar, emitir e fechar o mês.",
    stages: [
      {
        name: "Rotina diária",
        tasks: [
          t("Conferência bancária matinal", "CONCILIACAO_BANCARIA", 0, 30, ["Saldos de todas as contas", "Movimentações do dia anterior", "Alertas de saldo baixo"]),
          t("Conciliar os extratos do dia anterior", "CONCILIACAO_BANCARIA", 0, 45, ["Extrato importado", "Lançamentos conciliados", "Pendências anotadas"]),
          t("Registrar recebimentos e dar baixa", "CONTAS_A_RECEBER", 0, 30, ["Pix, boletos e cartões recebidos", "Baixas lançadas"]),
          t("Lançar documentos recebidos do cliente", "DOCUMENTACAO", 0, 40, ["Notas, boletos e comprovantes lançados", "Documentos ilegíveis ou faltando cobrados"]),
        ],
      },
      {
        name: "Rotina semanal",
        tasks: [
          t("Preparar a lista de pagamentos para aprovação", "CONTAS_A_PAGAR", 0, 45, ["Contas vencendo na semana", "Lista enviada ao cliente", "Aprovação registrada"], { priority: "ALTA" }),
          t("Agendar e efetuar os pagamentos aprovados", "CONTAS_A_PAGAR", 1, 60, ["Pagamentos agendados no banco", "Comprovantes anexados", "Baixas lançadas"]),
          t("Emitir notas fiscais de serviço", "EMISSAO_NF", 1, 45, ["Notas conferidas com os contratos", "Notas enviadas aos clientes do cliente"]),
          t("Cobrar clientes em atraso", "COBRANCA", 2, 45, ["Lista de inadimplentes atualizada", "Mensagens de cobrança enviadas", "Promessas de pagamento registradas"]),
          t("Atualizar o fluxo de caixa projetado", "FLUXO_DE_CAIXA", 3, 45, ["Entradas e saídas atualizadas", "Alertas para o cliente"]),
        ],
      },
      {
        name: "Fechamento do mês",
        tasks: [
          t("Conciliar todas as contas do mês", "FECHAMENTO_MENSAL", 0, 120, ["Todas as contas com saldo conferido", "Cartões conciliados", "Lançamentos sem categoria resolvidos"]),
          t("Conferir documentos do mês com o cliente", "DOCUMENTACAO", 1, 60, ["Notas e comprovantes completos", "Pendências cobradas"]),
          t("Fechar o mês no sistema", "FECHAMENTO_MENSAL", 2, 30, ["Mês bloqueado para novos lançamentos", "Revisão feita por outro analista"]),
          t("Montar o DRE e o relatório gerencial", "RELATORIOS_GERENCIAIS", 3, 120, ["DRE do mês", "Fluxo de caixa realizado e projetado", "Comentários e pontos de atenção"], { priority: "ALTA" }),
          t("Enviar o relatório ao cliente", "RELATORIOS_GERENCIAIS", 4, 20, ["Relatório enviado", "Confirmação de recebimento"]),
        ],
      },
    ],
  },
  {
    slug: "bpo-estrategico",
    name: "BPO estratégico",
    stage: "ESTRATEGICO",
    tone: "amber",
    icon: "lightbulb",
    summary: "Transformar números em decisões: indicadores, caixa e reunião de resultados.",
    stages: [
      {
        name: "Análise",
        tasks: [
          t("Analisar os indicadores do mês", "ESTRATEGICO", 0, 90, ["Receita, margem e despesas por categoria", "Comparação com o mês anterior", "Desvios que merecem atenção"]),
          t("Identificar vazamentos de caixa", "ESTRATEGICO", 2, 60, ["Despesas fora do padrão", "Cobranças duplicadas ou desnecessárias", "Oportunidades de renegociação"]),
          t("Projetar o caixa dos próximos 90 dias", "FLUXO_DE_CAIXA", 3, 90, ["Cenário base e cenário pessimista", "Necessidade de capital de giro"]),
        ],
      },
      {
        name: "Reunião de resultados",
        tasks: [
          t("Preparar a reunião mensal de resultados", "REUNIAO_CLIENTE", 5, 60, ["Apresentação com os principais números", "Recomendações priorizadas"]),
          t("Reunião de resultados com o cliente", "REUNIAO_CLIENTE", 7, 60, ["Apresentar resultados e recomendações", "Registrar as decisões", "Definir o plano de ação"], { priority: "ALTA" }),
          t("Acompanhar o plano de ação", "ESTRATEGICO", 14, 30, ["Ações em andamento", "Resultados já obtidos"]),
        ],
      },
    ],
  },
  {
    slug: "acompanhamento-retencao",
    name: "Acompanhamento e retenção",
    stage: "ACOMPANHAMENTO",
    tone: "orange",
    icon: "heart",
    summary: "Cuidar da relação para o cliente ficar e crescer.",
    stages: [
      {
        name: "Saúde da relação",
        tasks: [
          t("Check-in de relacionamento", "RELACIONAMENTO", 0, 20, ["Contato proativo com o cliente", "Como está a percepção do serviço", "Registrar o que foi dito"]),
          t("Avaliar o health score do cliente", "RELACIONAMENTO", 3, 30, ["Pontualidade nos envios do cliente", "Atrasos e retrabalho da nossa parte", "Nível de engajamento"]),
          t("Identificar risco de cancelamento", "RELACIONAMENTO", 5, 30, ["Sinais de insatisfação", "Atraso de pagamento da mensalidade", "Plano de recuperação, se houver risco"], { priority: "ALTA" }),
        ],
      },
      {
        name: "Satisfação e crescimento",
        tasks: [
          t("Pesquisa de satisfação (NPS)", "RELACIONAMENTO", 10, 30, ["Enviar a pesquisa", "Registrar a nota e os comentários"]),
          t("Tratar as respostas da pesquisa", "RELACIONAMENTO", 14, 30, ["Responder a quem deu nota baixa", "Registrar melhorias a fazer"]),
          t("Oferecer serviços adicionais", "RELACIONAMENTO", 20, 30, ["Identificar necessidades não atendidas", "Apresentar proposta de ampliação de escopo"]),
          t("Revisar o contrato e o valor do serviço", "DOCUMENTACAO", 25, 30, ["Reajuste anual", "Escopo atual x contratado"]),
        ],
      },
    ],
  },
  {
    slug: "encerramento-contrato",
    name: "Encerramento de contrato",
    stage: "ENCERRAMENTO",
    tone: "slate",
    icon: "door",
    summary: "Sair bem: aviso, entrega do histórico, revogação de acessos e distrato.",
    stages: [
      {
        name: "Aviso e transição",
        tasks: [
          t("Registrar o pedido de encerramento", "DOCUMENTACAO", 0, 20, ["Data do aviso e motivo", "Prazo de aviso prévio conforme o contrato"]),
          t("Entender o motivo e tentar reverter", "RELACIONAMENTO", 1, 40, ["Conversa com o cliente", "Proposta de ajuste, se fizer sentido"]),
          t("Combinar o cronograma de transição", "REUNIAO_CLIENTE", 3, 45, ["Última competência a fechar", "Entrega de documentos e relatórios", "Quem assume a rotina"]),
        ],
      },
      {
        name: "Entrega",
        tasks: [
          t("Fechar a última competência", "FECHAMENTO_MENSAL", 10, 120, ["Conciliação completa", "DRE e relatório final"]),
          t("Entregar o histórico e os arquivos", "DOCUMENTACAO", 12, 60, ["Exportar lançamentos e relatórios", "Organizar documentos do cliente", "Confirmar o recebimento"]),
          t("Emitir o distrato e a cobrança final", "CONTAS_A_RECEBER", 12, 30, ["Distrato gerado e assinado", "Última mensalidade cobrada"]),
        ],
      },
      {
        name: "Encerramento",
        tasks: [
          t("Revogar acessos do cliente", "DOCUMENTACAO", 14, 30, ["Bancos e sistemas", "Certificados e senhas guardadas", "Grupo de comunicação"], { priority: "ALTA" }),
          t("Inativar o cliente e as rotinas", "IMPLANTACAO", 14, 20, ["Pausar as recorrências", "Inativar o cadastro"]),
          t("Mensagem de despedida e pedido de indicação", "RELACIONAMENTO", 15, 15, ["Agradecer", "Deixar a porta aberta", "Pedir feedback"]),
        ],
      },
    ],
  },
  {
    slug: "cobranca-inadimplencia",
    name: "Cobrança e inadimplência",
    stage: "OPERACIONAL",
    tone: "red",
    icon: "wallet",
    summary: "Régua de cobrança para recuperar os valores em atraso.",
    stages: [
      {
        name: "Lembretes",
        tasks: [
          t("Lembrete antes do vencimento", "COBRANCA", 0, 15, ["Mensagem enviada 2 dias antes", "Boleto ou chave Pix anexado"]),
          t("Aviso no dia do vencimento", "COBRANCA", 2, 10, ["Conferir se foi pago", "Enviar lembrete se não foi"]),
          t("Primeira cobrança (D+1)", "COBRANCA", 3, 15, ["Mensagem cordial", "Oferecer segunda via"]),
        ],
      },
      {
        name: "Cobrança ativa",
        tasks: [
          t("Contato telefônico (D+5)", "COBRANCA", 7, 20, ["Ligar para o responsável", "Registrar a promessa de pagamento"]),
          t("Segunda cobrança formal (D+10)", "COBRANCA", 12, 20, ["Mensagem com valor atualizado", "Prazo final"], { priority: "ALTA" }),
          t("Negociar parcelamento", "COBRANCA", 14, 40, ["Proposta de acordo", "Acordo registrado por escrito"]),
        ],
      },
      {
        name: "Recuperação",
        tasks: [
          t("Notificação extrajudicial (D+30)", "COBRANCA", 32, 30, ["Notificação elaborada", "Enviada com comprovante"], { priority: "ALTA" }),
          t("Decidir suspensão do serviço", "REUNIAO_CLIENTE", 35, 30, ["Avaliar o histórico", "Comunicar a decisão ao cliente"]),
          t("Baixar ou protestar o título", "COBRANCA", 40, 30, ["Registrar o desfecho", "Atualizar o contas a receber"]),
        ],
      },
    ],
  },
];

export function getEsteira(slug: string) {
  return ESTEIRAS.find((e) => e.slug === slug);
}

export function esteiraCounts(e: Esteira) {
  const tasks = e.stages.flatMap((s) => s.tasks);
  return { stages: e.stages.length, tasks: tasks.length, items: tasks.reduce((n, x) => n + x.items.length, 0) };
}

/**
 * Responsável e janela de prazo originais do Controle de Implantação da Rosan.
 * O prazo da tarefa usa o fim da janela; aqui fica registrada a janela inteira.
 */
const CONTROLE: Record<string, [string, string]> = {
  "Reunião de diagnóstico financeiro": ["BPO", "Dia 1"],
  "Assinatura do contrato de prestação de serviços": ["Cliente + BPO", "Dia 1-3"],
  "Coleta do questionário de onboarding preenchido": ["Cliente", "Dia 3-5"],
  "Definição do sistema de gestão financeira a usar": ["BPO", "Dia 3-5"],
  "Criação de acesso ao sistema para o cliente": ["BPO", "Dia 5"],
  "Alinhamento de regime tributário com o contador": ["BPO + Contador", "Dia 5"],
  "Cadastro da empresa no sistema de gestão": ["BPO", "Sem. 1"],
  "Configuração do plano de contas": ["BPO", "Sem. 1"],
  "Cadastro de categorias de receita e despesa": ["BPO", "Sem. 1"],
  "Conexão bancária (Open Finance ou extrato manual)": ["BPO + Cliente", "Sem. 1-2"],
  "Importação do histórico financeiro (mínimo 3 meses)": ["BPO", "Sem. 2"],
  "Configuração de centro de custos (se aplicável)": ["BPO", "Sem. 2"],
  "Configuração de contas a pagar recorrentes": ["Cliente + BPO", "Sem. 2"],
  "Levantamento de todas as dívidas e obrigações": ["BPO", "Sem. 2"],
  "Organização do fluxo de caixa retroativo": ["BPO", "Sem. 2-3"],
  "Identificação de despesas fixas e variáveis": ["BPO", "Sem. 3"],
  "Conciliação bancária do período anterior": ["BPO", "Sem. 3"],
  "Mapeamento de fontes de receita": ["BPO + Cliente", "Sem. 3"],
  "Validação do DRE inicial com o cliente": ["BPO + Cliente", "Sem. 3-4"],
  "Treinamento do cliente no sistema (lançamentos básicos)": ["BPO", "Sem. 3"],
  "Definição do dia e horário do relatório mensal": ["BPO + Cliente", "Sem. 3"],
  "Alinhamento do processo de envio de documentos": ["BPO + Cliente", "Sem. 3"],
  "Primeiro relatório gerencial entregue e apresentado": ["BPO", "Sem. 4"],
  "Ajustes pós-primeiro relatório": ["BPO", "Sem. 4-5"],
  "Checagem final: todos os sistemas funcionando": ["BPO", "Sem. 5"],
  "Aprovação formal do cliente (e-mail ou assinatura)": ["Cliente", "Sem. 5"],
  "Briefing da rotina mensal acordada": ["BPO + Cliente", "Sem. 5"],
  "Implantação encerrada: operação regular iniciada": ["BPO", "Sem. 5"],
};
for (const e of ESTEIRAS) for (const st of e.stages) for (const k of st.tasks) {
  const c = CONTROLE[k.title];
  if (c && !k.description) k.description = `Responsável: ${c[0]}. Prazo no controle de implantação: ${c[1]}.`;
}

export function taskKey(slug: string, stageIdx: number, taskIdx: number) {
  return `${slug}:${stageIdx}:${taskIdx}`;
}

/** Converte etapas em texto editável:  ## Etapa / ### Título | Categoria | dia | minutos | Prioridade / - item */
export function stagesToText(stages: EsteiraStage[]): string {
  return stages
    .map((s) =>
      [
        `## ${s.name}`,
        ...s.tasks.map((k) =>
          [
            `### ${[k.title, CATEGORY_LABEL[k.category], k.day, k.minutes, k.priority && k.priority !== "NORMAL" ? PRIORITY_LABEL[k.priority] : ""].join(" | ").replace(/ \| $/, "")}`,
            ...(k.description ? [`> ${k.description}`] : []),
            ...k.items.map((i) => `- ${i}`),
          ].join("\n"),
        ),
      ].join("\n\n"),
    )
    .join("\n\n");
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Lê o texto editado. Lança Error com a linha problemática. */
export function textToStages(text: string): EsteiraStage[] {
  const stages: EsteiraStage[] = [];
  let task: EsteiraTask | null = null;
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const at = `Linha ${idx + 1}`;
    if (line.startsWith("### ")) {
      const stage = stages.at(-1);
      if (!stage) throw new Error(`${at}: crie uma etapa com "## Nome" antes da tarefa.`);
      const [title, cat, day, min, prio] = line.slice(4).split("|").map((p) => p.trim());
      if (!title) throw new Error(`${at}: a tarefa precisa de um título.`);
      const category = TASK_CATEGORIES.find((c) => norm(CATEGORY_LABEL[c]) === norm(cat ?? "") || c === cat) ;
      if (!category) throw new Error(`${at}: categoria "${cat ?? ""}" não existe. Use, por exemplo, "Documentação" ou "Cobrança".`);
      const d = Number(day), m = Number(min);
      if (!Number.isInteger(d) || d < 0 || d > 365) throw new Error(`${at}: o dia deve ser um número inteiro (0 a 365).`);
      if (!Number.isInteger(m) || m < 5 || m > 1440) throw new Error(`${at}: os minutos devem ser um número inteiro (5 a 1440).`);
      let priority: Priority | undefined;
      if (prio) {
        priority = PRIORITIES.find((p) => norm(PRIORITY_LABEL[p]) === norm(prio) || p === prio);
        if (!priority) throw new Error(`${at}: prioridade "${prio}" não existe (Baixa, Normal, Alta, Crítica).`);
      }
      task = { title, category, day: d, minutes: m, items: [], ...(priority && priority !== "NORMAL" ? { priority } : {}) };
      stage.tasks.push(task);
    } else if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      if (!name) throw new Error(`${at}: a etapa precisa de um nome.`);
      stages.push({ name, tasks: [] });
      task = null;
    } else if (line.startsWith("> ")) {
      if (!task) throw new Error(`${at}: a descrição precisa ficar abaixo de uma tarefa.`);
      task.description = line.slice(2).trim();
    } else if (line.startsWith("- ")) {
      if (!task) throw new Error(`${at}: o item de checklist precisa ficar abaixo de uma tarefa.`);
      const item = line.slice(2).trim();
      if (item) task.items.push(item);
    } else {
      throw new Error(`${at}: não entendi. Use "## Etapa", "### Tarefa | Categoria | dia | minutos", "> descrição" ou "- item".`);
    }
  });
  if (!stages.length) throw new Error("Crie ao menos uma etapa.");
  if (stages.some((s) => !s.tasks.length)) throw new Error("Toda etapa precisa de ao menos uma tarefa.");
  return stages;
}
