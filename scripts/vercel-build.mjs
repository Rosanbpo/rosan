// Build usado pela Vercel: aplica as migrações no banco e compila a aplicação.
// Migrações usam a conexão direta (sem pooler) quando disponível (ex.: Neon).
import { execSync } from "node:child_process";

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!direct) {
  console.error("DATABASE_URL não configurada. Conecte um banco Postgres ao projeto (aba Storage da Vercel).");
  process.exit(1);
}
if (!process.env.AUTH_SECRET) {
  console.error("AUTH_SECRET não configurada. Cadastre-a em Settings → Environment Variables.");
  process.exit(1);
}
const run = (cmd, env = process.env) => execSync(cmd, { stdio: "inherit", env });
run("npx prisma generate");
run("npx prisma migrate deploy", { ...process.env, DATABASE_URL: direct });
run("npx next build");
