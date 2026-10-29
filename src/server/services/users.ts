import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { assertCan, ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { parseInput, userCreateSchema, userUpdateSchema } from "../validation";
import { diffFields, recordAudit } from "./audit";

export async function listUsers(actor: Actor) {
  assertCan(actor, "users.manage");
  return prisma.membership.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          _count: { select: { clientMemberships: true } },
        },
      },
    },
    orderBy: [{ active: "desc" }, { user: { name: "asc" } }],
  });
}

export async function createUser(actor: Actor, raw: unknown) {
  assertCan(actor, "users.manage");
  const input = parseInput(userCreateSchema, raw);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError("Já existe um usuário com este e-mail.", { email: "E-mail já cadastrado." });
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    await tx.membership.create({ data: { userId: user.id, organizationId: actor.organizationId, role: input.role } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "User",
      entityId: user.id,
      action: "user.created",
      summary: `Usuário ${user.name} (${input.role}) criado`,
    });
    return user;
  });
}

export async function updateUser(actor: Actor, userId: string, raw: unknown) {
  assertCan(actor, "users.manage");
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: actor.organizationId } },
    include: { user: true },
  });
  if (!membership) throw new NotFoundError("Usuário não encontrado.");
  const input = parseInput(userUpdateSchema, raw);
  if (userId === actor.userId && (input.role !== "ADMIN" || !input.active)) {
    throw new ForbiddenError("Você não pode remover seu próprio acesso de administrador.");
  }
  const changes = {
    ...diffFields({ name: membership.user.name }, { name: input.name }, ["name"]),
    ...diffFields({ role: membership.role, active: membership.active }, { role: input.role, active: input.active }, [
      "role",
      "active",
    ]),
  };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { name: input.name } });
    await tx.membership.update({ where: { id: membership.id }, data: { role: input.role, active: input.active } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "User",
      entityId: userId,
      action: "user.updated",
      summary: `Usuário ${input.name} alterado`,
      changes: changes as Prisma.InputJsonValue,
    });
  });
}

export async function resetPassword(actor: Actor, userId: string, password: string) {
  assertCan(actor, "users.manage");
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: actor.organizationId } },
  });
  if (!membership) throw new NotFoundError("Usuário não encontrado.");
  if (password.length < 8) throw new ValidationError("A senha deve ter ao menos 8 caracteres.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await recordAudit(prisma, {
    organizationId: actor.organizationId,
    actorId: actor.userId,
    entityType: "User",
    entityId: userId,
    action: "user.password_reset",
    summary: "Senha redefinida pelo administrador",
  });
}

export async function changeOwnPassword(actor: Actor, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    throw new ValidationError("Senha atual incorreta.", { current: "Senha atual incorreta." });
  }
  if (next.length < 8) throw new ValidationError("A nova senha deve ter ao menos 8 caracteres.", { next: "Mínimo de 8 caracteres." });
  await prisma.user.update({ where: { id: actor.userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
}

export async function updateOrganization(actor: Actor, name: string) {
  assertCan(actor, "org.settings");
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new ValidationError("Informe o nome da empresa.");
  await prisma.organization.update({ where: { id: actor.organizationId }, data: { name: trimmed } });
}
