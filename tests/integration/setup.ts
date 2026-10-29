import { execSync } from "node:child_process";
import { config } from "dotenv";

const g = globalThis as { __testDbReady?: boolean };

if (!g.__testDbReady) {
  config();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Defina TEST_DATABASE_URL para rodar os testes de integração (o banco será limpo).");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL não pode ser igual a DATABASE_URL.");
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  g.__testDbReady = true;
}
