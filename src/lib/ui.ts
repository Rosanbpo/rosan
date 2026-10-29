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
