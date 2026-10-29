/**
 * Executa uma rodada de geração de tarefas recorrentes e encerra.
 * Uso: npm run scheduler:run   (agende via cron, ex.: a cada hora)
 */
import { PrismaClient } from "@prisma/client";
import { runScheduler } from "../src/server/services/generator";

async function main() {
  const db = new PrismaClient();
  try {
    const summary = await runScheduler({ trigger: "cron:cli", db });
    console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
    if (summary.errors.length) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
