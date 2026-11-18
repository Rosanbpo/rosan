"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as vault from "@/server/services/vault";

export async function addVaultItemAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await vault.createVaultItem(actor, clientId, formObject(fd));
    revalidatePath(`/clientes/${clientId}`);
    return "Guardado no cofre.";
  });
}

export async function deleteVaultItemAction(clientId: string, itemId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await vault.deleteVaultItem(actor, itemId);
    revalidatePath(`/clientes/${clientId}`);
    return "Removido do cofre.";
  });
}
