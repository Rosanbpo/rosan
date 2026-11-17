"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as procedures from "@/server/services/procedures";

export async function createProcedureAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  let clientId: string | null = null;
  const res = await runAction(async (actor) => {
    const row = await procedures.createProcedure(actor, formObject(fd));
    id = row.id;
    clientId = row.clientId;
  });
  if (res?.ok) redirect(clientId ? `/clientes/${clientId}?aba=pops` : `/pops/${id}`);
  return res;
}

export async function updateProcedureAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await procedures.updateProcedure(actor, id, formObject(fd));
  });
  if (res?.ok) redirect(`/pops/${id}`);
  return res;
}

export async function importPopLibraryAction(_: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const r = await procedures.importPopLibrary(actor);
    revalidatePath("/pops");
    return r.created ? `${r.created} processo(s) importado(s).` : "Todos os processos já estavam importados.";
  });
}

export async function copyProcedureToClientAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await procedures.copyProcedureToClient(actor, String(fd.get("procedureId") ?? ""), clientId)).id;
  });
  if (res?.ok) redirect(`/pops/${id}/editar`);
  return res;
}
