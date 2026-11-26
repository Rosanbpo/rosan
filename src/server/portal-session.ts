import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { readSession, type PortalSession } from "./services/portal-auth";

export const PORTAL_COOKIE = "portal_session";

export async function setPortalCookie(token: string, expiresAt: Date) {
  (await cookies()).set(PORTAL_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearPortalCookie() {
  (await cookies()).delete(PORTAL_COOKIE);
}

export const getPortalSession = cache(async (): Promise<PortalSession | null> => readSession((await cookies()).get(PORTAL_COOKIE)?.value));

/** Endereço público do portal, para montar links de convite e de senha. */
export async function portalBaseUrl() {
  if (process.env.PORTAL_BASE_URL) return process.env.PORTAL_BASE_URL.replace(/\/$/, "");
  if (process.env.PORTAL_HOST) return `https://${process.env.PORTAL_HOST}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

/** Em produção com PORTAL_HOST, o portal fica na raiz do domínio dele; sem isso, em /portal. */
export const portalPath = (p: string) => (process.env.PORTAL_HOST ? p.replace(/^\/portal/, "") || "/" : p);
