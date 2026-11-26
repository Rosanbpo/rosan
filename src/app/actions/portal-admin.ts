"use server";

import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import { mailConfigured } from "@/server/mail";
import { sendInviteEmail } from "@/server/portal-mail";
import { portalBaseUrl, portalPath } from "@/server/portal-session";
import { inviteToPortal, reinvitePortalUser, revokePortalAccess, setPortalUserSuspended } from "@/server/services/portal-auth";
import { prisma } from "@/server/db";

async function deliver(user: { email: string; name: string }, token: string, clientName: string): Promise<string> {
  const url = `${await portalBaseUrl()}${portalPath(`/portal/convite/${token}`)}`;
  if (mailConfigured()) {
    const r = await sendInviteEmail(user.email, user.name, clientName, url);
    if (r.ok) return `Convite enviado para ${user.email}.`;
    return `Não consegui enviar o e-mail (${r.error}). Copie e envie este link: ${url}`;
  }
  return `O envio de e-mail ainda não está configurado. Copie e envie este link (vale 7 dias): ${url}`;
}

export async function invitePortalAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const r = await inviteToPortal(actor, clientId, { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? "") });
    if (!r.token) return "Este usuário já tem senha. O acesso a esta empresa foi liberado.";
    return deliver(r.user, r.token, r.clientName);
  }, { revalidate: ["layout"] });
}

export async function reinvitePortalAction(userId: string, clientId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const r = await reinvitePortalUser(actor, userId);
    const c = await prisma.client.findUnique({ where: { id: clientId }, select: { tradeName: true } });
    return deliver(r.user, r.token, c?.tradeName ?? "sua empresa");
  }, { revalidate: ["layout"] });
}

export async function suspendPortalAction(userId: string, suspended: boolean, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await setPortalUserSuspended(actor, userId, suspended);
    return suspended ? "Acesso suspenso. As sessões abertas foram encerradas." : "Acesso reativado.";
  }, { revalidate: ["layout"] });
}

export async function revokePortalAction(userId: string, clientId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await revokePortalAccess(actor, userId, clientId);
    return "Acesso removido.";
  }, { revalidate: ["layout"] });
}
