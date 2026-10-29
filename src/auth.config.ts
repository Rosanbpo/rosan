import type { NextAuthConfig } from "next-auth";

/**
 * Configuração compatível com o runtime Edge (usada pelo middleware).
 * Não importa Prisma nem bcrypt.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.organizationId = (user as { organizationId?: string }).organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      (session as { organizationId?: string }).organizationId = token.organizationId as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
