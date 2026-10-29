"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as clients from "@/server/services/clients";

const ARRAYS = ["services", "memberIds"];

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await clients.createClient(actor, formObject(fd, { arrays: ARRAYS }))).id;
  });
  if (res?.ok) redirect(`/clientes/${id}`);
  return res;
}

export async function updateClientAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await clients.updateClient(actor, clientId, formObject(fd, { arrays: ARRAYS }));
  });
  if (res?.ok) redirect(`/clientes/${clientId}`);
  return res;
}

export async function archiveClientAction(clientId: string, archived: boolean, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await clients.setClientArchived(actor, clientId, archived);
    return archived ? "Cliente arquivado." : "Cliente reativado.";
  });
}
