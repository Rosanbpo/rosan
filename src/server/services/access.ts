import type { Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError, seesAllClients, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

/** Filtro de clientes visíveis ao usuário (sempre restrito à empresa dele). */
export function clientScope(actor: Actor): Prisma.ClientWhereInput {
  if (seesAllClients(actor)) return { organizationId: actor.organizationId };
  return { organizationId: actor.organizationId, members: { some: { userId: actor.userId } } };
}

/** Filtro de tarefas visíveis: tarefas dos clientes acessíveis. */
export function taskScope(actor: Actor): Prisma.TaskWhereInput {
  if (seesAllClients(actor)) return { organizationId: actor.organizationId };
  return {
    organizationId: actor.organizationId,
    client: { members: { some: { userId: actor.userId } } },
  };
}

export async function assertClientAccess(actor: Actor, clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, ...clientScope(actor) } });
  if (!client) {
    // Não revela se o cliente existe em outra empresa ou sem vínculo.
    throw new NotFoundError("Cliente não encontrado ou sem permissão de acesso.");
  }
  return client;
}

export async function assertTaskAccess(actor: Actor, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, ...taskScope(actor) } });
  if (!task) throw new NotFoundError("Tarefa não encontrada ou sem permissão de acesso.");
  return task;
}

/** Garante que o usuário pertence à empresa (e, opcionalmente, ao cliente). */
export async function assertUserInOrg(organizationId: string, userId: string, clientId?: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership || !membership.active) throw new ForbiddenError("Usuário informado não pertence à empresa.");
  if (clientId && membership.role !== "ADMIN") {
    const link = await prisma.clientMember.findUnique({ where: { clientId_userId: { clientId, userId } } });
    if (!link) throw new ForbiddenError("O usuário informado não está vinculado a este cliente.");
  }
  return membership;
}
