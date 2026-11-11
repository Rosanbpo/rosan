/**
 * Modelos de contrato e distrato (baseados nos modelos da Rosan).
 * Os textos ficam editáveis no sistema. Valores que mudam com os campos do
 * contrato usam marcadores {{assim}}, resolvidos na hora de exibir/imprimir.
 */

export type ClauseBlock = "services" | "fee" | "volumes" | "values";

export interface Clause {
  /** Título do capítulo (ex.: "II — DO OBJETO"); aparece quando muda. */
  section?: string;
  /** Título da cláusula, sem numeração (ex.: "Do Objeto"). */
  title: string;
  /** Parágrafos separados por linha em branco; linhas iniciadas por "- " viram lista. */
  text: string;
  /** Quadro exibido logo após o texto. */
  block?: ClauseBlock;
  /** Texto exibido depois do quadro (ex.: parágrafo único). */
  footnote?: string;
}

export const CONTRACT_STATUS_LABEL = { RASCUNHO: "Rascunho", ASSINADO: "Assinado", ENCERRADO: "Encerrado" } as const;
export type ContractStatus = keyof typeof CONTRACT_STATUS_LABEL;

const UNITS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];

/** Número por extenso de 0 a 99 (suficiente para meses e dias). */
export function extenso(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} e ${UNITS[u]}`;
}

export function numeroExtenso(n: number): string {
  return `${n} (${extenso(n)})`;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-11" → "11 de novembro de 2026". */
export function longDate(local: string | null | undefined): string {
  if (!local) return "___ de ____________ de 20___";
  const [y, m, d] = local.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export function shortDate(local: string | null | undefined): string {
  if (!local) return "___/___/______";
  const [y, m, d] = local.split("-");
  return `${d}/${m}/${y}`;
}

export interface TokenVars {
  inicio?: string | null;
  vigenciaMeses?: number | null;
  diaPagamento?: number | null;
  cidade?: string | null;
  dataContrato?: string | null;
  encerramento?: string | null;
  prazoQuitacao?: number | null;
}

export const TOKEN_HELP: Record<string, string> = {
  "{{inicio}}": "data de início do contrato",
  "{{vigencia}}": "prazo em meses, por extenso",
  "{{dia_pagamento}}": "dia de vencimento",
  "{{cidade}}": "cidade/UF do foro",
  "{{data_contrato}}": "data do contrato original",
  "{{encerramento}}": "data de encerramento dos serviços",
  "{{prazo_quitacao}}": "prazo de quitação em dias",
};

export function fillTokens(text: string, v: TokenVars): string {
  const map: Record<string, string> = {
    inicio: shortDate(v.inicio),
    vigencia: v.vigenciaMeses ? `${numeroExtenso(v.vigenciaMeses)} meses` : "___ (_____) meses",
    dia_pagamento: v.diaPagamento ? String(v.diaPagamento) : "___",
    cidade: v.cidade?.trim() || "____________________",
    data_contrato: shortDate(v.dataContrato),
    encerramento: shortDate(v.encerramento),
    prazo_quitacao: v.prazoQuitacao ? `${numeroExtenso(v.prazoQuitacao)} dias corridos` : "___ (_____) dias corridos",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (all, key: string) => map[key] ?? all);
}

export function buildContractClauses(): Clause[] {
  return [
    {
      section: "II — DO OBJETO",
      title: "Do Objeto",
      text:
        "O presente contrato tem por objeto a prestação de serviços especializados de apoio administrativo financeiro, compreendendo:",
      block: "services",
      footnote: "Parágrafo único: a disponibilização de funcionalidades específicas está condicionada ao plano do sistema de gestão operacional contratado pela CONTRATANTE.",
    },
    {
      section: "III — DAS CONDIÇÕES DE EXECUÇÃO",
      title: "Do Horário e Entregas",
      text: "Os serviços serão prestados remotamente, de segunda a sexta-feira, das 09h00 às 17h00 (horário de Brasília). Os relatórios mensais serão entregues até o 10º dia útil do mês subsequente, desde que a CONTRATANTE envie os documentos até o dia 5.",
    },
    {
      title: "Das Responsabilidades da CONTRATANTE",
      text: "A CONTRATANTE se compromete a:\n\n- Fornecer documentos e acessos até o dia 5 de cada mês;\n- Responder às solicitações em até 48 horas úteis;\n- Manter atualizados os acessos às plataformas utilizadas;\n- Fornecer dados completos para emissão de notas fiscais.",
    },
    {
      title: "Das Vedações à CONTRATADA",
      text: "Não integram o escopo: negociação com terceiros em nome da CONTRATANTE; tomada de decisões gerenciais; cobranças a clientes; controle de caixa físico; obrigações fiscais acessórias (SPED, EFD, DCTF), salvo se expressamente previstas em aditivo contratual.",
    },
    {
      section: "IV — DOS VALORES E REAJUSTE",
      title: "Dos Honorários",
      text: "O primeiro honorário será pago no ato da assinatura deste instrumento. Os demais serão pagos até o dia {{dia_pagamento}} de cada mês, por boleto ou PIX.",
      block: "fee",
    },
    {
      title: "Do Volume de Serviços",
      text: "Os serviços estão limitados aos volumes abaixo. Ultrapassados estes limites, horas adicionais serão orçadas separadamente.\n\nApós 3 (três) meses de vigência, as partes analisarão em conjunto os limites do plano e os ajustarão, caso necessário.",
      block: "volumes",
    },
    {
      title: "Do Reajuste",
      text: "O valor dos honorários será reajustado anualmente, a partir do 13º mês de vigência, com base na variação acumulada do índice IPCA no período.",
    },
    {
      title: "Da Inadimplência",
      text: "O não pagamento até o vencimento implicará multa de 2% sobre o valor devido, acrescida de juros de 1% ao mês e correção monetária pelo IPCA. Após 30 dias de inadimplência, a CONTRATADA poderá suspender os serviços mediante notificação por e-mail.",
    },
    {
      section: "V — DA VIGÊNCIA E RESCISÃO",
      title: "Da Vigência",
      text: "O presente contrato entra em vigor na data de {{inicio}} e tem vigência de {{vigencia}}, renovando-se automaticamente por iguais períodos, salvo manifestação contrária de qualquer das partes com antecedência mínima de 30 dias.",
    },
    {
      title: "Da Rescisão",
      text: "Qualquer das partes poderá rescindir o presente contrato mediante notificação por escrito com antecedência mínima de 30 (trinta) dias corridos. A rescisão imotivada pela CONTRATANTE antes do término da vigência implica multa de 20% sobre o saldo remanescente do contrato.",
    },
    {
      title: "Das Causas Imediatas de Rescisão",
      text: "Constituem causas de rescisão imediata:\n\n- Descumprimento reiterado de obrigações contratuais por qualquer das partes;\n- Inadimplência superior a 30 dias não regularizada;\n- Prática de atos ilícitos ou contrários à ética profissional;\n- Encerramento das atividades de qualquer das partes.",
    },
    {
      section: "VI — DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS",
      title: "Da Confidencialidade",
      text: "A CONTRATADA compromete-se a manter sigilo absoluto sobre todas as informações financeiras, operacionais e estratégicas da CONTRATANTE, durante a vigência do contrato e por 5 (cinco) anos após o seu encerramento.",
    },
    {
      title: "Da Lei Geral de Proteção de Dados — LGPD",
      text: "As partes comprometem-se a tratar os dados pessoais a que tiverem acesso em estrita conformidade com a Lei nº 13.709/2018 (LGPD), adotando medidas técnicas e organizacionais adequadas para garantir a segurança e a confidencialidade dos dados.",
    },
    {
      section: "VII — DAS DISPOSIÇÕES GERAIS",
      title: "Da Natureza do Vínculo",
      text: "Este contrato não estabelece entre as partes qualquer vínculo empregatício, societário ou de representação comercial. A CONTRATADA é prestadora autônoma de serviços.",
    },
    {
      title: "Do Foro",
      text: "As partes elegem o foro da comarca de {{cidade}} para dirimir quaisquer controvérsias decorrentes deste instrumento, com exclusão de qualquer outro, por mais privilegiado que seja.",
    },
    {
      title: "Da Integralidade",
      text: "Este instrumento constitui o acordo integral entre as partes, substituindo toda e qualquer negociação anterior, verbal ou escrita. Qualquer alteração somente terá validade se realizada por escrito e assinada por ambas as partes.",
    },
  ];
}

export function buildDistratoClauses(): Clause[] {
  return [
    {
      section: "II — DO CONTRATO ORIGINAL",
      title: "Do Contrato Rescindido",
      text: "As partes acima qualificadas celebraram, em {{data_contrato}}, o Contrato de Prestação de Serviços de Apoio Administrativo Financeiro, tendo por objeto a prestação de serviços especializados de apoio administrativo financeiro à CONTRATANTE (“Contrato Original”).\n\nPelo presente instrumento, as partes resolvem, de comum acordo, rescindir integralmente o Contrato Original, nos termos e condições a seguir estabelecidos.",
    },
    {
      section: "III — DA RESCISÃO",
      title: "Do Distrato",
      text: "As partes acordam, de forma amigável e de comum acordo, a rescisão do Contrato Original, dando-o por resolvido e extinto a partir da Data de Encerramento definida na cláusula seguinte, nada mais tendo a exigir uma da outra a esse título, ressalvado o disposto neste instrumento.",
    },
    {
      title: "Da Data de Encerramento dos Serviços",
      text: "Data de encerramento dos serviços: {{encerramento}}.\n\nA partir dessa data, cessam todas as obrigações de prestação de serviço da CONTRATADA, ressalvadas as pendências e obrigações que, por sua natureza, sobrevivem ao encerramento do contrato (confidencialidade, proteção de dados e eventuais valores pendentes).",
    },
    {
      section: "IV — DOS VALORES E PENDÊNCIAS",
      title: "Dos Valores Pendentes",
      text: "As partes declaram que, na data de encerramento, a situação financeira entre elas é a seguinte:",
      block: "values",
    },
    {
      title: "Da Quitação",
      text: "Efetuado o pagamento do saldo de quitação indicado acima, no prazo de até {{prazo_quitacao}} contados da assinatura deste instrumento, as partes se dão mutuamente plena, geral e irrevogável quitação quanto às obrigações financeiras decorrentes do Contrato Original, nada mais tendo a reclamar uma da outra, a qualquer título, em qualquer tempo ou instância.",
    },
    {
      section: "V — DA DEVOLUÇÃO DE ACESSOS E DADOS",
      title: "Da Devolução de Documentos e Acessos",
      text: "A CONTRATADA compromete-se a, em até 5 (cinco) dias úteis contados da Data de Encerramento:\n\n- Devolver ou revogar todos os acessos a sistemas, plataformas, e-mails, bancos e senhas da CONTRATANTE que estejam sob sua guarda;\n- Entregar à CONTRATANTE todos os documentos, planilhas, relatórios e arquivos relativos à execução dos serviços;\n- Confirmar por escrito a conclusão da devolução de acessos e documentos.",
    },
    {
      title: "Dos Dados Armazenados",
      text: "Encerrado o prazo da cláusula anterior, a CONTRATADA excluirá de seus sistemas e arquivos internos os dados pessoais e financeiros da CONTRATANTE que não sejam de guarda obrigatória por lei, em conformidade com a Lei nº 13.709/2018 (LGPD).",
    },
    {
      section: "VI — DA CONFIDENCIALIDADE",
      title: "Da Sobrevivência do Sigilo",
      text: "Permanecem plenamente vigentes, mesmo após a rescisão, as obrigações de confidencialidade assumidas no Contrato Original, pelo prazo nele estabelecido, contado a partir da Data de Encerramento.",
    },
    {
      section: "VII — DAS DISPOSIÇÕES GERAIS",
      title: "Da Quitação Geral e Irrevogável",
      text: "Este distrato representa a composição final e definitiva entre as partes quanto ao Contrato Original, não subsistindo qualquer outra obrigação além das expressamente previstas neste instrumento.",
    },
    {
      title: "Do Foro",
      text: "As partes elegem o foro da comarca de {{cidade}} para dirimir quaisquer controvérsias decorrentes deste instrumento, com exclusão de qualquer outro, por mais privilegiado que seja.",
    },
  ];
}

/** Saldo de quitação = mensalidades em aberto + serviços não faturados − créditos a devolver. */
export function settlementBalance(v: { pendingMonthly?: number | null; unbilled?: number | null; credits?: number | null }): number {
  return Math.round(((v.pendingMonthly ?? 0) + (v.unbilled ?? 0) - (v.credits ?? 0)) * 100) / 100;
}
