/**
 * Processo de longa duração que executa a geração periodicamente.
 * Alternativa ao cron para servidores com gerenciador de processos (pm2, systemd, Docker).
 * Intervalo em minutos via SCHEDULER_INTERVAL_MINUTES (padrão 60).
 */
import { PrismaClient } from "@prisma/client";
import { runScheduler } from "../src/server/services/generator";

const db = new PrismaClient();
const minutes = Math.max(5, Number(process.env.SCHEDULER_INTERVAL_MINUTES ?? 60));

async function tick() {
  try {
    const summary = await runScheduler({ trigger: "worker", db });
    console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
  } catch (error) {
    console.error("[scheduler]", error);
  }
}

console.log(`Agendador iniciado: execução a cada ${minutes} min.`);
void tick();
const timer = setInterval(tick, minutes * 60_000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(timer);
    await db.$disconnect();
    process.exit(0);
  });
}
