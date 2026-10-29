import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./server/db";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { label: "E-mail" }, password: { label: "Senha", type: "password" } },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { memberships: { where: { active: true }, orderBy: { createdAt: "asc" } } },
        });
        // Mesmo custo de verificação quando o usuário não existe (evita enumeração por tempo).
        const hash = user?.passwordHash ?? "$2b$10$emqxxiGO19vUTzLeyy6LhOM0AD6OxZ/dtEy1OjW5vqz2nihVNZzXO";
        const valid = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !valid || !user.active) return null;
        // Credenciais demonstrativas nunca são aceitas em produção.
        if (user.isDemo && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_LOGIN !== "true") return null;
        const membership = user.memberships[0];
        if (!membership) return null;
        return { id: user.id, name: user.name, email: user.email, organizationId: membership.organizationId };
      },
    }),
  ],
});
