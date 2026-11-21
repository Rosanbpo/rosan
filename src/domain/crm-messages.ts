import type { LeadStage } from "./enums";

export interface MessageTemplate {
  id: string;
  group: string;
  title: string;
  /** Etapas em que a mensagem aparece primeiro; vazio = aparece em todas. */
  stages: LeadStage[];
  body: string;
}

/** Variáveis aceitas nos textos. */
export const MESSAGE_VARS = ["{nome}", "{empresa}", "{segmento}", "{valor}", "{minhaNome}", "{minhaEmpresa}"] as const;

export function fillMessage(body: string, v: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (m, k: string) => (k in v && v[k] ? v[k] : m));
}

/** Meta de leads novos por dia (comercial). */
export const DAILY_LEAD_GOAL = 5;

const GREET = "Olá, {nome}! Tudo bem?";

export const SYSTEM_MESSAGES: MessageTemplate[] = [
  {
    id: "sys-frio", group: "Lead novo", title: "🤝 Primeiro contato frio", stages: ["NOVO"],
    body: `${GREET} Aqui é {minhaNome}, da {minhaEmpresa}. A gente cuida do financeiro de empresas como a {empresa}: contas a pagar e receber, conciliação, fluxo de caixa e relatórios, para você saber o resultado do mês sem precisar mexer em planilha.\n\nPosso te explicar em 10 minutos como funciona? Se fizer sentido, marcamos uma conversa de diagnóstico, sem compromisso.`,
  },
  {
    id: "sys-indicacao", group: "Lead novo", title: "🤝 Primeiro contato por indicação", stages: ["NOVO"],
    body: `${GREET} Aqui é {minhaNome}, da {minhaEmpresa}. Fui indicada para conversar com você e achei que poderíamos nos ajudar: cuidamos da rotina financeira de empresas do segmento de {segmento}.\n\nTem um horário essa semana para uma conversa rápida de diagnóstico?`,
  },
  {
    id: "sys-confirmar", group: "Contato", title: "📅 Confirmar reunião de diagnóstico", stages: ["CONTATO", "REUNIAO"],
    body: `${GREET} Passando para confirmar nossa conversa de diagnóstico. Será que o horário combinado continua bom para você?\n\nPara aproveitarmos melhor o tempo, se puder, deixe à mão: bancos que a {empresa} usa, como vocês controlam contas a pagar e receber hoje e quais relatórios gostariam de ter.`,
  },
  {
    id: "sys-prereuniao", group: "Diagnóstico", title: "📅 Pré-reunião (WhatsApp)", stages: ["CONTATO", "REUNIAO"],
    body: `${GREET} Nossa reunião é em breve. Vou te enviar um link para entrarmos juntos. Qualquer imprevisto, é só me avisar por aqui que a gente remarca sem problema.`,
  },
  {
    id: "sys-roteiro", group: "Diagnóstico", title: "📋 Roteiro de diagnóstico", stages: ["REUNIAO"],
    body: `Roteiro para a conversa com {empresa}:\n\n1. Como funciona o financeiro hoje? Quem lança e quem paga?\n2. Quais bancos, cartões e sistemas são usados?\n3. Quantas contas a pagar e a receber por mês, em média?\n4. Existe conciliação bancária e fechamento do mês?\n5. Quais relatórios o dono gostaria de receber?\n6. Qual o maior incômodo hoje no financeiro?\n7. Qual o prazo ideal para começar?`,
  },
  {
    id: "sys-proposta", group: "Diagnóstico", title: "📄 Envio de proposta", stages: ["REUNIAO", "PROPOSTA"],
    body: `${GREET} Conforme conversamos, segue a proposta para a {empresa}, com o escopo do serviço e a mensalidade de {valor}.\n\nFico à disposição para tirar qualquer dúvida. Posso te ligar amanhã para a gente ver os detalhes juntos?`,
  },
  {
    id: "sys-followup", group: "Proposta", title: "🔔 Follow-up da proposta", stages: ["PROPOSTA", "NEGOCIACAO"],
    body: `${GREET} Passando para saber o que achou da proposta que enviei para a {empresa}. Ficou alguma dúvida sobre o escopo ou o valor? Se preferir, a gente ajusta alguma coisa.`,
  },
  {
    id: "sys-ultimo", group: "Proposta", title: "⏰ Último contato", stages: ["PROPOSTA", "NEGOCIACAO"],
    body: `${GREET} Como ainda não tive retorno, vou deixar a proposta da {empresa} em aberto por mais alguns dias e depois encerro por aqui, para não incomodar. Se o momento mudar, é só me chamar. Posso ajudar em alguma coisa antes disso?`,
  },
  {
    id: "sys-cobrar", group: "Proposta", title: "✍️ Cobrar aprovação pendente", stages: ["PROPOSTA", "NEGOCIACAO"],
    body: `${GREET} Falta só a sua aprovação para começarmos o trabalho com a {empresa}. Posso encaminhar o contrato para assinatura ainda hoje? Assim já agendamos o início.`,
  },
  {
    id: "sys-boasvindas", group: "Fechado", title: "🎉 Boas-vindas e próximos passos", stages: ["GANHO"],
    body: `${GREET} Que alegria ter a {empresa} com a gente! 🎉\n\nOs próximos passos são:\n1. Assinatura do contrato\n2. Envio dos acessos e documentos\n3. Reunião de início para alinharmos rotinas e prazos\n\nQualquer dúvida, estou por aqui. — {minhaNome}, {minhaEmpresa}`,
  },
  {
    id: "sys-contrato", group: "Fechado", title: "📝 Solicitar assinatura de contrato", stages: ["GANHO"],
    body: `${GREET} Enviei o contrato da {empresa} para assinatura eletrônica. Assim que assinar, damos início oficialmente. Se tiver qualquer dúvida sobre alguma cláusula, me chame.`,
  },
  {
    id: "sys-acessos", group: "Fechado", title: "🔑 Solicitar acessos", stages: ["GANHO"],
    body: `${GREET} Para começarmos a rotina da {empresa}, preciso dos acessos de leitura: bancos (internet banking ou extratos), sistema de gestão/ERP e e-mail financeiro. Se preferir, posso orientar passo a passo para criar acessos seguros, sem compartilhar a sua senha pessoal.`,
  },
  {
    id: "sys-bpo-wpp", group: "Educação", title: "📚 O que é BPO? (WhatsApp)", stages: [],
    body: `BPO Financeiro é terceirizar a rotina financeira para uma equipe especializada: pagamentos, recebimentos, conciliação bancária, fluxo de caixa e relatórios. Você deixa de se ocupar com o operacional e passa a receber informação confiável para decidir. Quer que eu te mostre como seria para a {empresa}?`,
  },
  {
    id: "sys-bpo-mail", group: "Educação", title: "📚 O que é BPO? (e-mail completo)", stages: [],
    body: `Assunto: O que é BPO Financeiro e como pode ajudar a {empresa}\n\nOlá, {nome}!\n\nBPO Financeiro (Business Process Outsourcing) é a terceirização da rotina financeira para uma equipe especializada. Na prática, cuidamos de:\n- Contas a pagar e a receber\n- Conciliação bancária\n- Fluxo de caixa e projeções\n- Relatórios gerenciais mensais (DRE e indicadores)\n\nVocê ganha tempo, reduz erros e passa a decidir com números em dia. Se fizer sentido, posso explicar em uma conversa curta.\n\nUm abraço,\n{minhaNome} — {minhaEmpresa}`,
  },
  {
    id: "sys-obj-contador", group: "Objeções", title: '🛡 "Já tenho contador"', stages: [],
    body: `Que ótimo ter um contador de confiança! O nosso trabalho é diferente: o contador cuida de impostos e obrigações legais; nós cuidamos do dia a dia financeiro (pagar, receber, conciliar e acompanhar o caixa). Um complementa o outro, e a gente conversa com o seu contador para ficar tudo alinhado.`,
  },
  {
    id: "sys-obj-caro", group: "Objeções", title: '🛡 "É caro"', stages: [],
    body: `Entendo, {nome}. Vale comparar com o custo de ter uma pessoa dedicada ao financeiro (salário, encargos, treinamento) e com o que se perde hoje em atrasos, multas e decisões sem número. Podemos montar um escopo menor para começar e ampliar depois. O que pesa mais para você: o valor total ou o que está incluso?`,
  },
  {
    id: "sys-obj-momento", group: "Objeções", title: '🛡 "Não é o momento"', stages: [],
    body: `Sem problema, {nome}. Posso te procurar daqui a algumas semanas? Enquanto isso, se quiser, te envio um material curto sobre como organizar o fluxo de caixa sozinho. Sem compromisso.`,
  },
  {
    id: "sys-obj-pensar", group: "Objeções", title: '🛡 "Deixa eu pensar"', stages: [],
    body: `Claro, {nome}, é uma decisão importante. Para te ajudar a pensar: qual ponto ainda te deixa em dúvida: valor, escopo ou prazo? Se eu souber, consigo te trazer uma resposta objetiva. Posso te chamar na quinta para saber o que decidiu?`,
  },
];
