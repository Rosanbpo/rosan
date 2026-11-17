"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as banks from "@/server/services/bank-accounts";

export async function addBankAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const clientId = String(fd.get("clientId") ?? "");
    await banks.addBankAccount(actor, clientId, formObject(fd));
    revalidatePath(`/clientes/${clientId}`);
    return "Conta adicionada.";
  });
}

export async function removeBankAccountAction(clientId: string, accountId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await banks.removeBankAccount(actor, accountId);
    revalidatePath(`/clientes/${clientId}`);
    return "Conta removida.";
  });
}
