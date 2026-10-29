import { CLOSED_STATUSES, type Role, type TaskStatus } from "./enums";

/** "Atrasada" é calculada: prazo vencido e tarefa ainda não concluída/cancelada. */
export function isOverdue(task: { status: TaskStatus; dueAt: Date }, now: Date = new Date()): boolean {
  return !CLOSED_STATUSES.includes(task.status) && task.dueAt.getTime() < now.getTime();
}

/** Concluída no prazo: data de conclusão menor ou igual ao prazo. */
export function completedOnTime(task: { completedAt: Date | null; dueAt: Date }): boolean {
  return task.completedAt !== null && task.completedAt.getTime() <= task.dueAt.getTime();
}

export const TASK_ACTIONS = [
  "START",
  "TO_TODO",
  "WAIT_CLIENT",
  "WAIT_THIRD",
  "RESUME",
  "SUBMIT_REVIEW",
  "APPROVE",
  "RETURN",
  "COMPLETE",
  "CANCEL",
  "REOPEN",
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

export const ACTION_LABEL: Record<TaskAction, string> = {
  START: "Iniciar",
  TO_TODO: "Voltar para a fazer",
  WAIT_CLIENT: "Aguardar cliente",
  WAIT_THIRD: "Aguardar terceiro",
  RESUME: "Retomar",
  SUBMIT_REVIEW: "Enviar para revisão",
  APPROVE: "Aprovar e concluir",
  RETURN: "Devolver ao operador",
  COMPLETE: "Concluir",
  CANCEL: "Cancelar",
  REOPEN: "Reabrir",
};

/** Ações que exigem justificativa/motivo informado pelo usuário. */
export const ACTIONS_REQUIRING_NOTE: readonly TaskAction[] = ["WAIT_CLIENT", "WAIT_THIRD", "RETURN", "CANCEL", "REOPEN"];
/** Ações que exigem data de próximo acompanhamento. */
export const ACTIONS_REQUIRING_FOLLOW_UP: readonly TaskAction[] = ["WAIT_CLIENT", "WAIT_THIRD"];

const FROM: Record<TaskAction, readonly TaskStatus[]> = {
  START: ["A_FAZER"],
  TO_TODO: ["EM_ANDAMENTO"],
  WAIT_CLIENT: ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO_TERCEIRO"],
  WAIT_THIRD: ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO_CLIENTE"],
  RESUME: ["AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO"],
  SUBMIT_REVIEW: ["A_FAZER", "EM_ANDAMENTO"],
  APPROVE: ["EM_REVISAO"],
  RETURN: ["EM_REVISAO"],
  COMPLETE: ["A_FAZER", "EM_ANDAMENTO"],
  CANCEL: ["A_FAZER", "EM_ANDAMENTO", "AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO", "EM_REVISAO"],
  REOPEN: ["CONCLUIDA", "CANCELADA"],
};

export function targetStatus(action: TaskAction, from: TaskStatus): TaskStatus {
  switch (action) {
    case "START":
    case "RESUME":
    case "RETURN":
      return "EM_ANDAMENTO";
    case "TO_TODO":
      return "A_FAZER";
    case "WAIT_CLIENT":
      return "AGUARDANDO_CLIENTE";
    case "WAIT_THIRD":
      return "AGUARDANDO_TERCEIRO";
    case "SUBMIT_REVIEW":
      return "EM_REVISAO";
    case "APPROVE":
    case "COMPLETE":
      return "CONCLUIDA";
    case "CANCEL":
      return "CANCELADA";
    case "REOPEN":
      return from === "CANCELADA" ? "A_FAZER" : "EM_ANDAMENTO";
  }
}

export interface TaskSnapshot {
  status: TaskStatus;
  assigneeId: string | null;
  reviewerId: string | null;
  requiresEvidence: boolean;
  checklist: Array<{ required: boolean; done: boolean }>;
  evidenceCount: number;
}

export interface ActorInfo {
  userId: string;
  role: Role;
}

export interface TransitionInput {
  note?: string | null;
  followUpDate?: string | null;
  /** Data local de hoje (AAAA-MM-DD), para validar o acompanhamento. */
  today?: string;
}

export type TransitionCheck = { ok: true; to: TaskStatus } | { ok: false; error: string };

/** Pendências de conclusão: checklist obrigatório e evidência. */
export function completionBlockers(task: TaskSnapshot): string[] {
  const blockers: string[] = [];
  const pending = task.checklist.filter((i) => i.required && !i.done).length;
  if (pending > 0) blockers.push(`${pending} item(ns) obrigatório(s) do checklist pendente(s).`);
  if (task.requiresEvidence && task.evidenceCount === 0) blockers.push("Esta tarefa exige ao menos uma evidência (link).");
  return blockers;
}

function isManager(role: Role) {
  return role === "ADMIN" || role === "GESTOR";
}

/**
 * Valida uma transição de status. Pressupõe que o acesso do usuário ao
 * cliente da tarefa já foi verificado. Usada por todos os fluxos (botões,
 * Kanban e API), garantindo as mesmas regras em qualquer ponto de entrada.
 */
export function checkTransition(
  task: TaskSnapshot,
  action: TaskAction,
  actor: ActorInfo,
  input: TransitionInput = {},
): TransitionCheck {
  if (!FROM[action].includes(task.status)) {
    return { ok: false, error: `Não é possível "${ACTION_LABEL[action].toLowerCase()}" uma tarefa com este status.` };
  }

  const isAssignee = task.assigneeId === actor.userId;
  const isReviewer = task.reviewerId === actor.userId;
  const manager = isManager(actor.role);
  const note = input.note?.trim() ?? "";

  // Permissões por ação
  switch (action) {
    case "APPROVE":
    case "RETURN":
      if (!isReviewer && !manager) return { ok: false, error: "Apenas o revisor ou um gestor pode revisar esta tarefa." };
      if (action === "APPROVE" && isAssignee)
        return { ok: false, error: "Quem executou a tarefa não pode aprovar a própria entrega." };
      break;
    case "CANCEL":
    case "REOPEN":
      if (!manager) return { ok: false, error: "Apenas administradores e gestores podem cancelar ou reabrir tarefas." };
      break;
    default:
      // Operador só movimenta tarefas atribuídas a ele (ou assume uma sem responsável ao iniciar).
      if (!manager && !isAssignee && !(action === "START" && task.assigneeId === null)) {
        return { ok: false, error: "Você só pode movimentar tarefas sob sua responsabilidade." };
      }
  }

  if (ACTIONS_REQUIRING_NOTE.includes(action) && note.length < 3) {
    const what = action === "WAIT_CLIENT" || action === "WAIT_THIRD" ? "o motivo da pendência" : "a justificativa";
    return { ok: false, error: `Informe ${what}.` };
  }

  if (ACTIONS_REQUIRING_FOLLOW_UP.includes(action)) {
    if (!input.followUpDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.followUpDate)) {
      return { ok: false, error: "Informe a data prevista para acompanhamento." };
    }
    if (input.today && input.followUpDate < input.today) {
      return { ok: false, error: "A data de acompanhamento não pode estar no passado." };
    }
  }

  if (action === "SUBMIT_REVIEW") {
    if (!task.reviewerId) return { ok: false, error: "Esta tarefa não tem revisor definido." };
    const blockers = completionBlockers(task);
    if (blockers.length) return { ok: false, error: blockers.join(" ") };
  }

  if (action === "COMPLETE") {
    if (task.reviewerId) return { ok: false, error: "Esta tarefa tem revisor: envie para revisão antes de concluir." };
    const blockers = completionBlockers(task);
    if (blockers.length) return { ok: false, error: blockers.join(" ") };
  }

  if (action === "APPROVE") {
    const blockers = completionBlockers(task);
    if (blockers.length) return { ok: false, error: blockers.join(" ") };
  }

  return { ok: true, to: targetStatus(action, task.status) };
}

/**
 * Ações disponíveis para exibição. Inclui ações bloqueadas apenas por
 * requisitos de conclusão (checklist/evidência), para orientar o usuário;
 * a validação final sempre ocorre no servidor.
 */
export function availableActions(task: TaskSnapshot, actor: ActorInfo): TaskAction[] {
  const relaxed = { ...task, checklist: [], requiresEvidence: false };
  return TASK_ACTIONS.filter(
    (action) => checkTransition(relaxed, action, actor, { note: "---", followUpDate: "9999-12-31" }).ok,
  );
}

/**
 * Converte um movimento no Kanban (status de destino) na ação equivalente,
 * para que o Kanban use exatamente as mesmas validações.
 */
export function actionForTarget(from: TaskStatus, to: TaskStatus): TaskAction | null {
  if (from === to) return null;
  switch (to) {
    case "A_FAZER":
      return from === "EM_ANDAMENTO" ? "TO_TODO" : from === "CANCELADA" ? "REOPEN" : null;
    case "EM_ANDAMENTO":
      if (from === "A_FAZER") return "START";
      if (from === "AGUARDANDO_CLIENTE" || from === "AGUARDANDO_TERCEIRO") return "RESUME";
      if (from === "EM_REVISAO") return "RETURN";
      if (from === "CONCLUIDA") return "REOPEN";
      return null;
    case "AGUARDANDO_CLIENTE":
      return "WAIT_CLIENT";
    case "AGUARDANDO_TERCEIRO":
      return "WAIT_THIRD";
    case "EM_REVISAO":
      return "SUBMIT_REVIEW";
    case "CONCLUIDA":
      return from === "EM_REVISAO" ? "APPROVE" : "COMPLETE";
    case "CANCELADA":
      return "CANCEL";
  }
}
