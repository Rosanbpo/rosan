"use server";

import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import { addToDayGoal, removeFromDayGoal } from "@/server/services/day-goal";

export async function addDayGoalAction(taskId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await addToDayGoal(actor, taskId);
    return "Adicionada à meta do dia.";
  }, { revalidate: ["layout"] });
}

export async function addDayGoalFormAction(fd: FormData) {
  const id = String(fd.get("taskId") ?? "");
  if (id) await addDayGoalAction(id, null);
}

export async function removeDayGoalFormAction(fd: FormData) {
  const id = String(fd.get("taskId") ?? "");
  if (!id) return;
  await runAction(async (actor) => {
    await removeFromDayGoal(actor, id);
  }, { revalidate: ["layout"] });
}
