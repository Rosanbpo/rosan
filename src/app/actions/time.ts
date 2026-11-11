"use server";

import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as time from "@/server/services/time";

export async function logTimeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await time.logTime(actor, formObject(fd));
    return "Horas apontadas.";
  });
}

export async function deleteTimeAction(id: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await time.deleteTimeEntry(actor, id);
    return "Apontamento removido.";
  });
}
