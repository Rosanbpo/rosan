import type { Role } from "./enums";

/**
 * Contexto do usuário autenticado. Sempre montado no servidor a partir do
 * banco (nunca a partir de dados enviados pelo navegador).
 */
export interface Actor {
  userId: string;
  organizationId: string;
  role: Role;
  name: string;
}

export type Permission =
  | "org.settings" // empresa, feriados
  | "users.manage"
  | "clients.manage" // criar/editar/arquivar clientes e vínculos
  | "templates.manage"
  | "recurrences.manage" // criar/editar/pausar recorrências (nos clientes acessíveis)
  | "tasks.plan" // atribuir responsável/revisor, alterar prazos e prioridade de qualquer tarefa acessível
  | "tasks.create"
  | "dashboard.view"
  | "audit.view";

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "org.settings",
    "users.manage",
    "clients.manage",
    "templates.manage",
    "recurrences.manage",
    "tasks.plan",
    "tasks.create",
    "dashboard.view",
    "audit.view",
  ],
  GESTOR: ["recurrences.manage", "tasks.plan", "tasks.create", "dashboard.view", "audit.view"],
  OPERADOR: ["tasks.create"],
};

export function can(actor: Pick<Actor, "role">, permission: Permission): boolean {
  return MATRIX[actor.role].includes(permission);
}

/** Administradores enxergam todos os clientes da empresa; demais papéis, só os vinculados. */
export function seesAllClients(actor: Pick<Actor, "role">): boolean {
  return actor.role === "ADMIN";
}

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para realizar esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Registro não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertCan(actor: Pick<Actor, "role">, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError();
}
