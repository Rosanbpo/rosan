"use server";

import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import * as timer from "@/server/services/timer";

const PATHS = { revalidate: ["layout"] };

export async function startTimerAction(taskId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await timer.startTimer(actor, taskId);
    return "Cronômetro iniciado.";
  }, PATHS);
}

export async function pauseTimerAction(taskId: string | null, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await timer.pauseTimer(actor, taskId ?? undefined);
    return "Cronômetro pausado e tempo registrado.";
  }, PATHS);
}

export async function finishTaskAction(taskId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const res = await timer.finishTask(actor, taskId);
    return res.status === "EM_REVISAO" ? "Tarefa enviada para revisão." : "Tarefa concluída.";
  }, PATHS);
}
