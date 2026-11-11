import type { JourneyStage, Priority, TaskCategory } from "./enums";

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
    summary: "Preparar a entrada do cliente: documentos, acessos e boas-vindas.",
    stages: [
      {
        name: "Boas-vindas",
        tasks: [
          t("Enviar mensagem de boas-vindas", "RELACIONAMENTO", 0, 20, ["Apresentar a equipe e os canais de contato", "Explicar os próximos passos", "Combinar o horário do kick-off"]),
          t("Criar grupo de comunicação com o cliente", "RELACIONAMENTO", 0, 15, ["Criar o grupo no WhatsApp", "Definir quem do cliente participa", "Combinar horários de atendimento"]),
          t("Cadastrar o cliente no sistema financeiro", "IMPLANTACAO", 1, 30, ["Criar a empresa no sistema", "Cadastrar CNPJ, regime tributário e responsável"]),
        ],
      },
      {
        name: "Documentos e acessos",
        tasks: [
          t("Solicitar documentos da empresa", "DOCUMENTACAO", 1, 30, ["Contrato social e CNPJ", "Documento do sócio responsável", "Certificado digital, se houver", "Regime tributário e contador"]),
          t("Solicitar acessos bancários", "DOCUMENTACAO", 2, 30, ["Definir nível de acesso (consulta ou operação)", "Registrar quem autoriza pagamentos", "Receber extratos dos últimos 3 meses"], { priority: "ALTA" }),
          t("Solicitar acessos a sistemas e cartões", "DOCUMENTACAO", 2, 30, ["ERP ou sistema de gestão", "Emissor de notas fiscais", "Faturas dos cartões", "Marketplaces e maquininhas"]),
          t("Conferir pendências de documentos", "DOCUMENTACAO", 5, 20, ["Listar o que ainda falta", "Cobrar o cliente", "Registrar o prazo combinado"]),
        ],
      },
      {
        name: "Contrato e cobrança",
        tasks: [
          t("Conferir contrato assinado", "DOCUMENTACAO", 1, 20, ["Contrato assinado por ambas as partes", "Valor, vencimento e reajuste conferidos", "Arquivar no cadastro do cliente"]),
          t("Configurar a cobrança da mensalidade", "CONTAS_A_RECEBER", 3, 20, ["Definir forma de cobrança", "Cadastrar a mensalidade", "Avisar o cliente do primeiro vencimento"]),
          t("Montar o plano de implantação", "IMPLANTACAO", 4, 40, ["Definir datas e responsáveis", "Compartilhar o cronograma com o cliente"]),
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
    summary: "Conhecer a fundo o financeiro do cliente antes de implantar.",
    stages: [
      {
        name: "Kick-off",
        tasks: [
          t("Reunião de kick-off", "REUNIAO_CLIENTE", 0, 60, ["Alinhar escopo e responsabilidades", "Combinar rotina e prazos de envio", "Definir canais e horários", "Apresentar o cronograma"], { priority: "ALTA" }),
          t("Registrar a ata do kick-off", "DOCUMENTACAO", 0, 20, ["Resumir o que foi combinado", "Enviar a ata ao cliente"]),
          t("Definir alçadas de aprovação de pagamento", "REUNIAO_CLIENTE", 2, 30, ["Quem aprova até qual valor", "Como a aprovação será registrada"]),
        ],
      },
      {
        name: "Mapeamento do financeiro",
        tasks: [
          t("Mapear contas bancárias e cartões", "CONCILIACAO_BANCARIA", 3, 45, ["Bancos, agências e contas", "Cartões de crédito e débito", "Saldos na data de início"]),
          t("Mapear recebíveis", "CONTAS_A_RECEBER", 4, 60, ["Formas de recebimento (boleto, Pix, cartão)", "Contas a receber em aberto", "Inadimplência atual"]),
          t("Mapear despesas e fornecedores", "CONTAS_A_PAGAR", 4, 60, ["Principais fornecedores e prazos", "Despesas fixas e recorrentes", "Contas a pagar em aberto"]),
          t("Mapear o processo atual e os gargalos", "IMPLANTACAO", 5, 90, ["Como o cliente controla o caixa hoje", "Onde há retrabalho ou atraso", "Pontos de atenção para a implantação"]),
        ],
      },
      {
        name: "Panorama inicial",
        tasks: [
          t("Montar o panorama financeiro inicial", "RELATORIOS_GERENCIAIS", 8, 90, ["Saldo, contas a pagar e a receber", "Principais despesas", "Riscos identificados"]),
          t("Apresentar o panorama ao cliente", "REUNIAO_CLIENTE", 10, 60, ["Mostrar os achados", "Validar as prioridades", "Confirmar o início da implantação"]),
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
    summary: "Configurar o sistema financeiro e colocar a operação no ar.",
    stages: [
      {
        name: "Configuração do sistema",
        tasks: [
          t("Cadastrar plano de contas, categorias e centros de custo", "IMPLANTACAO", 0, 120, ["Plano de contas aprovado pelo cliente", "Categorias de receita e despesa", "Centros de custo, se usados"]),
          t("Cadastrar contas bancárias e cartões", "IMPLANTACAO", 1, 45, ["Contas com saldo inicial", "Cartões e dia de fechamento da fatura"]),
          t("Cadastrar fornecedores e clientes", "IMPLANTACAO", 2, 120, ["Importar ou digitar a base", "Conferir CNPJ/CPF e dados de pagamento"]),
          t("Configurar integrações e conciliação", "IMPLANTACAO", 3, 60, ["Importação de extratos (OFX)", "Regras automáticas de conciliação", "Integração com emissor de notas, se houver"]),
        ],
      },
      {
        name: "Primeiros lançamentos",
        tasks: [
          t("Lançar contas a pagar em aberto", "CONTAS_A_PAGAR", 5, 120, ["Todas as contas em aberto lançadas", "Conferir valores e vencimentos com o cliente"]),
          t("Lançar contas a receber em aberto", "CONTAS_A_RECEBER", 5, 120, ["Todos os recebíveis lançados", "Conferir com o extrato"]),
          t("Conciliar o último mês fechado", "CONCILIACAO_BANCARIA", 8, 120, ["Extrato importado", "Saldo conferido com o banco", "Diferenças explicadas"]),
          t("Definir o calendário de pagamentos", "CONTAS_A_PAGAR", 9, 45, ["Dias de pagamento da semana", "Regra de envio da lista para aprovação"]),
        ],
      },
      {
        name: "Go-live e validação",
        tasks: [
          t("Vincular as rotinas recorrentes ao cliente", "IMPLANTACAO", 10, 30, ["Conciliação diária", "Contas a pagar e a receber", "Fechamento mensal", "Responsável e revisor definidos"], { description: "Em Rotinas → Recorrências, vincule os modelos ao cliente." }),
          t("Montar o primeiro fluxo de caixa projetado", "FLUXO_DE_CAIXA", 12, 90, ["Entradas e saídas dos próximos 60 dias", "Saldo mínimo projetado", "Alertas de falta de caixa"]),
          t("Reunião de validação e go-live", "REUNIAO_CLIENTE", 15, 60, ["Mostrar o sistema configurado", "Confirmar a data de início da rotina", "Registrar o aceite do cliente"], { priority: "ALTA" }),
          t("Entregar o primeiro relatório gerencial", "RELATORIOS_GERENCIAIS", 20, 120, ["DRE e fluxo de caixa", "Principais indicadores", "Envio e apresentação ao cliente"]),
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

export function taskKey(slug: string, stageIdx: number, taskIdx: number) {
  return `${slug}:${stageIdx}:${taskIdx}`;
}
