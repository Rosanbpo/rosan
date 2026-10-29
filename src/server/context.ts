import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Actor } from "@/domain/permissions";
import { can, type Permission } from "@/domain/permissions";
import { prisma } from "./db";

/**
 * Carrega o usuário autenticado e o vínculo com a empresa diretamente do
 * banco a cada requisição: desativações e mudanças de papel valem na hora.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = (session as { organizationId?: string } | null)?.organizationId;
  if (!userId || !organizationId) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { user: true },
  });
  if (!membership || !membership.active || !membership.user.active) return null;
  if (membership.user.isDemo && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_LOGIN !== "true")
    return null;
  return { userId, organizationId, role: membership.role, name: membership.user.name };
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

/** Para páginas: redireciona para a tela inicial quando não há permissão. */
export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) redirect("/?negado=1");
  return actor;
}
