import type { ClientStatus, Priority, TaskStatus } from "@/domain/enums";

export const STATUS_STYLE: Record<TaskStatus, string> = {
  A_FAZER: "bg-slate-100 text-slate-700 ring-slate-300",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-blue-200",
  AGUARDANDO_CLIENTE: "bg-amber-50 text-amber-800 ring-amber-200",
  AGUARDANDO_TERCEIRO: "bg-orange-50 text-orange-800 ring-orange-200",
  EM_REVISAO: "bg-violet-50 text-violet-700 ring-violet-200",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELADA: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  A_FAZER: "bg-slate-400",
  EM_ANDAMENTO: "bg-blue-500",
  AGUARDANDO_CLIENTE: "bg-amber-500",
  AGUARDANDO_TERCEIRO: "bg-orange-500",
  EM_REVISAO: "bg-violet-500",
  CONCLUIDA: "bg-emerald-500",
  CANCELADA: "bg-zinc-400",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  BAIXA: "text-slate-500",
  NORMAL: "text-sky-700",
  ALTA: "text-amber-700",
  CRITICA: "text-red-700 font-semibold",
};

export const CLIENT_STATUS_STYLE: Record<ClientStatus, string> = {
  IMPLANTACAO: "bg-sky-50 text-sky-700 ring-sky-200",
  ATIVO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PAUSADO: "bg-amber-50 text-amber-800 ring-amber-200",
  ENCERRADO: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const PROPOSAL_STYLE: Record<"RASCUNHO" | "ENVIADA" | "ACEITA" | "RECUSADA" | "VENCIDA", string> = {
  RASCUNHO: "bg-slate-100 text-slate-700 ring-slate-300",
  ENVIADA: "bg-sky-50 text-sky-700 ring-sky-200",
  ACEITA: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  RECUSADA: "bg-zinc-100 text-zinc-500 ring-zinc-200",
  VENCIDA: "bg-amber-50 text-amber-800 ring-amber-200",
};

export const CONTRACT_STYLE: Record<"RASCUNHO" | "ASSINADO" | "ENCERRADO", string> = {
  RASCUNHO: "bg-slate-100 text-slate-700 ring-slate-300",
  ASSINADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ENCERRADO: "bg-amber-50 text-amber-800 ring-amber-200",
};

/** Paleta de tons coloridos (classes estáticas para o Tailwind enxergar). */
export const TONE = {
  sky: { soft: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", solid: "bg-sky-600", band: "from-sky-600 to-sky-500", chip: "bg-sky-100 text-sky-800" },
  teal: { soft: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", solid: "bg-teal-600", band: "from-teal-600 to-teal-500", chip: "bg-teal-100 text-teal-800" },
  emerald: { soft: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", solid: "bg-emerald-600", band: "from-emerald-600 to-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
  amber: { soft: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", solid: "bg-amber-600", band: "from-amber-600 to-amber-500", chip: "bg-amber-100 text-amber-900" },
  indigo: { soft: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", solid: "bg-indigo-600", band: "from-indigo-700 to-indigo-500", chip: "bg-indigo-100 text-indigo-800" },
  violet: { soft: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", solid: "bg-violet-600", band: "from-violet-600 to-violet-500", chip: "bg-violet-100 text-violet-800" },
  orange: { soft: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", solid: "bg-orange-600", band: "from-orange-600 to-orange-500", chip: "bg-orange-100 text-orange-900" },
  slate: { soft: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", solid: "bg-slate-600", band: "from-slate-700 to-slate-500", chip: "bg-slate-200 text-slate-800" },
  red: { soft: "bg-red-50", border: "border-red-200", text: "text-red-700", solid: "bg-red-600", band: "from-red-600 to-red-500", chip: "bg-red-100 text-red-800" },
} as const;

export const STAGE_TONE = {
  COMERCIAL: "sky",
  PRE_ONBOARDING: "teal",
  ONBOARDING: "emerald",
  IMPLANTACAO: "indigo",
  OPERACIONAL: "violet",
  ESTRATEGICO: "amber",
  ACOMPANHAMENTO: "orange",
  ENCERRAMENTO: "slate",
} as const satisfies Record<string, keyof typeof TONE>;
