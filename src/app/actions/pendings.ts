"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as pendings from "@/server/services/pendings";

export async function createPendingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await pendings.createManualPending(actor, formObject(fd));
    revalidatePath("/pendencias");
    return "Pendência criada.";
  });
}
