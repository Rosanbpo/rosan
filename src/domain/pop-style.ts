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

/** Cores pastel das colunas (visão "Por categoria"), no estilo do Notion. */
export const POP_COLUMN: Record<TaskCategory, { col: string; chip: string; card: string }> = {
  CONTAS_A_PAGAR: { col: "bg-sky-50/70", chip: "bg-sky-100 text-sky-800", card: "border-sky-100" },
  CONTAS_A_RECEBER: { col: "bg-emerald-50/70", chip: "bg-emerald-100 text-emerald-800", card: "border-emerald-100" },
  CONCILIACAO_BANCARIA: { col: "bg-indigo-50/70", chip: "bg-indigo-100 text-indigo-800", card: "border-indigo-100" },
  COBRANCA: { col: "bg-rose-50/70", chip: "bg-rose-100 text-rose-800", card: "border-rose-100" },
  FLUXO_DE_CAIXA: { col: "bg-cyan-50/70", chip: "bg-cyan-100 text-cyan-800", card: "border-cyan-100" },
  DOCUMENTACAO: { col: "bg-amber-50/70", chip: "bg-amber-100 text-amber-800", card: "border-amber-100" },
  FECHAMENTO_MENSAL: { col: "bg-violet-50/70", chip: "bg-violet-100 text-violet-800", card: "border-violet-100" },
  RELATORIOS_GERENCIAIS: { col: "bg-fuchsia-50/70", chip: "bg-fuchsia-100 text-fuchsia-800", card: "border-fuchsia-100" },
  REUNIAO_CLIENTE: { col: "bg-teal-50/70", chip: "bg-teal-100 text-teal-800", card: "border-teal-100" },
  IMPLANTACAO: { col: "bg-orange-50/70", chip: "bg-orange-100 text-orange-800", card: "border-orange-100" },
  EMISSAO_NF: { col: "bg-lime-50/70", chip: "bg-lime-100 text-lime-800", card: "border-lime-100" },
  RELACIONAMENTO: { col: "bg-pink-50/70", chip: "bg-pink-100 text-pink-800", card: "border-pink-100" },
  ESTRATEGICO: { col: "bg-yellow-50/70", chip: "bg-yellow-100 text-yellow-800", card: "border-yellow-100" },
  OUTRAS: { col: "bg-slate-100/70", chip: "bg-slate-200 text-slate-700", card: "border-slate-200" },
};
