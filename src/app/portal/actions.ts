"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { clearPortalCookie, getPortalSession, PORTAL_COOKIE, portalBaseUrl, portalPath, setPortalCookie } from "@/server/portal-session";
import { sendResetEmail } from "@/server/portal-mail";
import { acceptInvite, endSession, portalLogin, requestPasswordReset, resetPassword } from "@/server/services/portal-auth";
import { cookies } from "next/headers";

const ua = async () => (await headers()).get("user-agent") ?? undefined;

function fail(e: unknown): ActionState {
  unstable_rethrow(e);
  if (e instanceof ValidationError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors, at: Date.now() };
  console.error("[portal]", e);
  return { ok: false, error: "Não foi possível concluir. Tente novamente.", at: Date.now() };
}

export async function portalLoginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await portalLogin(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""), await ua());
    await setPortalCookie(s.token, s.expiresAt);
  } catch (e) {
    return fail(e);
  }
  redirect(portalPath("/portal"));
}

export async function acceptInviteAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const pw = String(fd.get("password") ?? "");
    if (pw !== String(fd.get("confirm") ?? "")) throw new ValidationError("As senhas não são iguais.", { confirm: "As senhas não são iguais" });
    const s = await acceptInvite(token, pw, await ua());
    await setPortalCookie(s.token, s.expiresAt);
  } catch (e) {
    return fail(e);
  }
  redirect(portalPath("/portal"));
}

export async function requestResetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const r = await requestPasswordReset(String(fd.get("email") ?? ""));
    if (r) await sendResetEmail(r.user.email, r.user.name, `${await portalBaseUrl()}${portalPath(`/portal/redefinir/${r.token}`)}`);
    return { ok: true, message: "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.", at: Date.now() };
  } catch (e) {
    return fail(e);
  }
}

export async function resetPasswordAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const pw = String(fd.get("password") ?? "");
    if (pw !== String(fd.get("confirm") ?? "")) throw new ValidationError("As senhas não são iguais.", { confirm: "As senhas não são iguais" });
    await resetPassword(token, pw);
  } catch (e) {
    return fail(e);
  }
  redirect(`${portalPath("/portal/login")}?senha=ok`);
}

export async function portalLogoutAction() {
  await endSession((await cookies()).get(PORTAL_COOKIE)?.value);
  await clearPortalCookie();
  redirect(portalPath("/portal/login"));
}

export async function requirePortal() {
  const s = await getPortalSession();
  if (!s) redirect(portalPath("/portal/login"));
  return s;
}
