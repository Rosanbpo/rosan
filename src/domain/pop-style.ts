import type { TaskCategory } from "./enums";

export const POP_EMOJI: Record<TaskCategory, string> = {
  CONTAS_A_PAGAR: "💸", CONTAS_A_RECEBER: "💰", CONCILIACAO_BANCARIA: "🏦", COBRANCA: "📣", FLUXO_DE_CAIXA: "🌊", DOCUMENTACAO: "🗂️",
  FECHAMENTO_MENSAL: "📅", RELATORIOS_GERENCIAIS: "📊", REUNIAO_CLIENTE: "🤝", IMPLANTACAO: "🚀", EMISSAO_NF: "🧾", RELACIONAMENTO: "💙", ESTRATEGICO: "💡", OUTRAS: "📄",
};

/** Capa em degradê suave, no estilo das capas do Notion. */
export const POP_COVER: Record<TaskCategory, string> = {
  CONTAS_A_PAGAR: "from-sky-200 via-sky-100 to-indigo-100", CONTAS_A_RECEBER: "from-emerald-200 via-emerald-100 to-teal-100", CONCILIACAO_BANCARIA: "from-indigo-200 via-blue-100 to-sky-100",
  COBRANCA: "from-rose-200 via-orange-100 to-amber-100", FLUXO_DE_CAIXA: "from-cyan-200 via-sky-100 to-blue-100", DOCUMENTACAO: "from-amber-200 via-yellow-100 to-orange-100",
  FECHAMENTO_MENSAL: "from-violet-200 via-indigo-100 to-blue-100", RELATORIOS_GERENCIAIS: "from-fuchsia-200 via-violet-100 to-indigo-100", REUNIAO_CLIENTE: "from-teal-200 via-emerald-100 to-sky-100",
  IMPLANTACAO: "from-orange-200 via-amber-100 to-rose-100", EMISSAO_NF: "from-lime-200 via-emerald-100 to-teal-100", RELACIONAMENTO: "from-pink-200 via-rose-100 to-violet-100",
  ESTRATEGICO: "from-yellow-200 via-amber-100 to-orange-100", OUTRAS: "from-slate-200 via-slate-100 to-blue-100",
};

export const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
