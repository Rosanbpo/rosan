import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const authMiddleware = NextAuth(authConfig).auth;

/**
 * Separação por endereço (opcional, via variáveis de ambiente):
 * - PORTAL_HOST: endereço do Portal do Cliente. Nele só existe o portal.
 * - CENTRAL_HOST: endereço da Central. Nele o portal não existe.
 * Sem as variáveis, tudo continua funcionando como antes (portal em /portal).
 */
export default function middleware(req: NextRequest, evt: NextFetchEvent) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  const { pathname } = req.nextUrl;
  const portalHost = process.env.PORTAL_HOST;
  const centralHost = process.env.CENTRAL_HOST;

  if (portalHost && host === portalHost) {
    if (pathname.startsWith("/api")) return new NextResponse(null, { status: 404 });
    if (pathname === "/portal" || pathname.startsWith("/portal/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(/^\/portal/, "") || "/";
      return NextResponse.redirect(url);
    }
    const url = req.nextUrl.clone();
    url.pathname = `/portal${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (centralHost && host === centralHost && (pathname === "/portal" || pathname.startsWith("/portal/"))) {
    return new NextResponse(null, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (authMiddleware as any)(req, evt);
}

export const config = {
  // Rotas de API de autenticação e cron têm proteção própria.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|logo.png|icon.png).*)"],
};
