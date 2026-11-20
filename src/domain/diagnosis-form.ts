/**
 * Questionário completo do diagnóstico financeiro do cliente: junta o formulário de captação
 * (Google Forms) com o mapeamento financeiro. Todas as perguntas são obrigatórias no link público.
 */
export type QType = "text" | "email" | "tel" | "textarea" | "number" | "money" | "yesno" | "radio" | "checks";

export interface Question {
  key: string;
  label: string;
  type: QType;
  hint?: string;
  options?: string[];
  /** Radio com opção "Outro": exige o texto em `${key}Other`. */
  other?: boolean;
}
export interface Section {
  id: string;
  emoji: string;
  title: string;
  intro: string;
  questions: Question[];
}

const SERVICES = [
  "Contas a pagar",
  "Contas a receber",
  "Conciliação bancária",
  "Emissão de boletos",
  "Emissão de notas fiscais",
  "Agendamento de pagamentos",
  "Relatórios (inadimplentes, contas a pagar, DRE e fluxo de caixa)",
  "Reunião mensal de análise dos resultados",
];

export const REGIMES = ["MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real", "Não sei"] as const;
export const BOOKS = ["Organizado", "Parcialmente organizado", "Desorganizado"] as const;

export const DIAGNOSIS_SECTIONS: Section[] = [
  {
    id: "contato", emoji: "👤", title: "Sobre você e a empresa", intro: "Para a gente saber com quem está falando.",
    questions: [
      { key: "contactName", label: "Qual é o seu nome?", type: "text" },
      { key: "contactPhone", label: "Qual é o seu WhatsApp, com DDD?", type: "tel" },
      { key: "contactEmail", label: "Qual é o seu e-mail?", type: "email" },
      { key: "companyName", label: "Qual é o nome da empresa?", type: "text" },
      { key: "cnpj", label: "Qual é o CNPJ?", type: "text", hint: "Só números ou com pontos e traço." },
      { key: "segment", label: "Qual é a área de atuação?", type: "text", hint: "Ex.: loja de roupa, restaurante, advocacia." },
    ],
  },
  {
    id: "perfil", emoji: "🏢", title: "Perfil da empresa", intro: "Porte, equipe e estrutura.",
    questions: [
      { key: "regime", label: "Qual é o regime tributário?", type: "radio", options: [...REGIMES] },
      { key: "partners", label: "Quantos sócios a empresa tem?", type: "number" },
      { key: "employeesClt", label: "Quantos funcionários CLT?", type: "number", hint: "Se não tem, digite 0." },
      { key: "employeesPj", label: "Quantos prestadores PJ fixos?", type: "number", hint: "Se não tem, digite 0." },
      { key: "multiCnpj", label: "A empresa tem mais de um CNPJ?", type: "yesno" },
      { key: "inventory", label: "A empresa controla estoque de mercadorias?", type: "yesno" },
    ],
  },
  {
    id: "movimento", emoji: "📊", title: "Movimento do mês", intro: "Use a média de um mês normal. Estimativas servem.",
    questions: [
      { key: "revenue", label: "Qual é o faturamento médio mensal?", type: "money", hint: "Em reais. Ex.: 50.000,00" },
      { key: "salesCount", label: "Quantas vendas ou serviços são feitos por mês?", type: "number" },
      { key: "payablesCount", label: "Quantas contas a pagar por mês?", type: "number", hint: "Fornecedores, aluguel, impostos, folha, internet... Some todas." },
      { key: "invoicesCount", label: "Quantas notas fiscais são emitidas por mês?", type: "number", hint: "Se não emite, digite 0." },
      { key: "boletosCount", label: "Quantos boletos são emitidos por mês?", type: "number", hint: "Se não emite, digite 0." },
      { key: "contractsActive", label: "Quantos contratos ativos com receita fixa (recorrente)?", type: "number", hint: "Se não tem, digite 0." },
      { key: "newContractsMonth", label: "Quantos contratos novos, em média, por mês?", type: "number", hint: "Se não tem, digite 0." },
      { key: "statementLines", label: "Quantas movimentações aparecem nos extratos por mês, somando todas as contas?", type: "number", hint: "Olhe o extrato de um mês e some as linhas de todas as contas." },
    ],
  },
  {
    id: "bancos", emoji: "🏦", title: "Bancos, cartões e vendas", intro: "Onde o dinheiro entra e sai.",
    questions: [
      { key: "bankAccounts", label: "Quantas contas bancárias PJ estão em uso?", type: "number", hint: "Se não tem, digite 0." },
      { key: "banks", label: "Quais bancos?", type: "text", hint: "Ex.: Itaú, Inter. Se não tem, escreva Nenhum." },
      { key: "cardsCount", label: "Quantos cartões de crédito PJ para compras?", type: "number", hint: "Se não tem, digite 0." },
      { key: "sellsCard", label: "A empresa vende no cartão de crédito ou débito?", type: "yesno" },
      { key: "machinesCount", label: "Quantas maquininhas de cartão estão em uso?", type: "number", hint: "Se não tem, digite 0." },
      { key: "cardOperators", label: "Quais operadoras de cartão?", type: "text", hint: "Ex.: Stone, Cielo, Rede. Se não usa, escreva Nenhuma." },
      { key: "sellsOnline", label: "Vende por site, loja virtual ou marketplace?", type: "yesno" },
      { key: "onlinePlatforms", label: "Quais plataformas?", type: "text", hint: "Ex.: Mercado Livre, Shopee, Nuvemshop. Se não usa, escreva Nenhuma." },
      { key: "hasLoan", label: "Existe empréstimo ou financiamento ativo?", type: "yesno" },
      { key: "loanDetail", label: "Qual empréstimo ou financiamento, e qual o valor da parcela?", type: "text", hint: "Se não tem, escreva Nenhum." },
    ],
  },
  {
    id: "sistemas", emoji: "🧩", title: "Sistemas e organização", intro: "Como o financeiro funciona hoje.",
    questions: [
      { key: "usesErp", label: "Vocês usam sistema de gestão financeira (ERP)?", type: "yesno" },
      { key: "erpName", label: "Qual sistema?", type: "text", hint: "Ex.: Omie, Conta Azul, Nibo. Se não usa, escreva Nenhum." },
      { key: "books", label: "Como está o financeiro hoje?", type: "radio", options: [...BOOKS] },
      { key: "catchUpMonths", label: "Quantos meses estão atrasados para colocar em dia?", type: "number", hint: "Se está em dia, digite 0." },
    ],
  },
  {
    id: "busca", emoji: "🎯", title: "O que você procura", intro: "Para montar a proposta certa.",
    questions: [
      { key: "services", label: "Quais serviços você deseja?", type: "checks", options: SERVICES, hint: "Marque pelo menos um." },
      { key: "outsourceBoletos", label: "Deseja terceirizar a emissão de boletos?", type: "radio", options: ["Sim", "Não", "Não emito boletos"] },
      { key: "outsourceInvoices", label: "Deseja terceirizar a emissão de notas fiscais?", type: "radio", options: ["Sim", "Não", "Outro prestador já faz", "Não emito notas fiscais"] },
      { key: "painPoints", label: "O que você busca com a terceirização financeira? Qual a sua maior dor?", type: "textarea", hint: "O que quer ver e controlar no dia a dia." },
      { key: "specificNeeds", label: "Existe alguma necessidade específica? Fique à vontade para contar.", type: "textarea", hint: "Se não houver, escreva Nenhuma." },
      { key: "howFound", label: "Como você conheceu a Rosan Finanças?", type: "radio", options: ["Redes sociais", "Site", "Indicação", "Outro"], other: true },
    ],
  },
];

export const ALL_QUESTIONS = DIAGNOSIS_SECTIONS.flatMap((s) => s.questions);
export type Answers = Record<string, string | string[]>;

const clean = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const isNo = (s: string) => /^(nenhum[ao]?|não|nao|n[aã]o tenho|-|0)$/i.test(s.trim());

/** Lê as respostas do formulário (FormData já convertido em objeto). */
export function readAnswers(raw: Record<string, unknown>): Answers {
  const out: Answers = {};
  for (const q of ALL_QUESTIONS) {
    if (q.type === "checks") {
      const v = raw[q.key];
      out[q.key] = (Array.isArray(v) ? v : v ? [v] : []).map(String).filter((x) => q.options!.includes(x));
    } else {
      const v = clean(raw[q.key]);
      if (v) out[q.key] = v.slice(0, q.type === "textarea" ? 2000 : 300);
    }
    if (q.other) {
      const o = clean(raw[`${q.key}Other`]);
      if (o) out[`${q.key}Other`] = o.slice(0, 200);
    }
  }
  return out;
}

/** Perguntas sem resposta válida. Vazio = formulário completo. */
export function missingQuestions(a: Answers): Question[] {
  const bad: Question[] = [];
  for (const q of ALL_QUESTIONS) {
    const v = a[q.key];
    let ok: boolean;
    switch (q.type) {
      case "checks": ok = Array.isArray(v) && v.length > 0; break;
      case "number": ok = typeof v === "string" && /^\d{1,9}$/.test(v); break;
      case "money": ok = typeof v === "string" && moneyValue(v) !== null; break;
      case "yesno": ok = v === "Sim" || v === "Não"; break;
      case "radio": ok = typeof v === "string" && q.options!.includes(v) && (!(q.other && v === "Outro") || !!a[`${q.key}Other`]); break;
      case "email": ok = typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); break;
      case "tel": ok = typeof v === "string" && v.replace(/\D/g, "").length >= 10; break;
      default: ok = typeof v === "string" && v.length >= (q.type === "textarea" ? 2 : 1);
    }
    if (!ok) bad.push(q);
  }
  return bad;
}

export function moneyValue(s: string): number | null {
  const n = Number(s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1_000_000_000 && /\d/.test(s) ? n : null;
}

const num = (a: Answers, k: string) => {
  const v = a[k];
  return typeof v === "string" && /^\d+$/.test(v) ? Number(v) : 0;
};
const yes = (a: Answers, k: string) => a[k] === "Sim";
const str = (a: Answers, k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");

/** Converte as respostas nos campos que alimentam a precificação. */
export function toColumns(a: Answers) {
  const regimeMap: Record<string, "MEI" | "SIMPLES" | "PRESUMIDO" | "REAL"> = { MEI: "MEI", "Simples Nacional": "SIMPLES", "Lucro Presumido": "PRESUMIDO", "Lucro Real": "REAL", "Não sei": "SIMPLES" };
  const booksMap: Record<string, "ORGANIZADA" | "PARCIAL" | "DESORGANIZADA"> = { Organizado: "ORGANIZADA", "Parcialmente organizado": "PARCIAL", Desorganizado: "DESORGANIZADA" };
  const services = Array.isArray(a.services) ? a.services : [];
  const list = (...parts: string[]) => parts.map((p) => p.trim()).filter((p) => p && !isNo(p)).join(", ");
  const cardCount = num(a, "cardsCount");
  const machines = num(a, "machinesCount");
  const notes = [str(a, "painPoints") && `Busca: ${str(a, "painPoints")}`, str(a, "specificNeeds") && !isNo(str(a, "specificNeeds")) ? `Necessidades: ${str(a, "specificNeeds")}` : ""].filter(Boolean).join("\n");
  return {
    regime: regimeMap[str(a, "regime")] ?? "SIMPLES",
    revenue: moneyValue(str(a, "revenue")) ?? 0,
    bankAccounts: num(a, "bankAccounts"),
    statementLines: num(a, "statementLines"),
    /** Contas a pagar + vendas/serviços do mês: base dos lançamentos. */
    entries: num(a, "payablesCount") + num(a, "salesCount"),
    employees: num(a, "employeesClt") + num(a, "employeesPj"),
    inventory: yes(a, "inventory"),
    multiCnpj: yes(a, "multiCnpj"),
    cardsAndMarketplaces: yes(a, "sellsCard") || yes(a, "sellsOnline") || machines > 0 || cardCount > 0,
    wantsReports: services.some((s) => s.startsWith("Relatórios") || s.startsWith("Reunião")),
    books: booksMap[str(a, "books")] ?? "ORGANIZADA",
    catchUpMonths: num(a, "catchUpMonths"),
    banks: str(a, "banks") && !isNo(str(a, "banks")) ? str(a, "banks") : null,
    platforms: list(str(a, "erpName"), str(a, "onlinePlatforms")) || null,
    cards: list(cardCount ? `${cardCount} cartão(ões) de crédito PJ` : "", machines ? `${machines} maquininha(s)` : "", str(a, "cardOperators")) || null,
    notes: notes || null,
  };
}

/** Valor mostrado de uma resposta (para a equipe revisar). */
export function displayAnswer(a: Answers, q: Question): string {
  const v = a[q.key];
  if (Array.isArray(v)) return v.join("; ");
  if (!v) return "";
  return q.other && v === "Outro" && a[`${q.key}Other`] ? `Outro: ${a[`${q.key}Other`]}` : q.type === "money" ? `R$ ${v}` : v;
}
