"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as procedures from "@/server/services/procedures";

export async function createProcedureAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await procedures.createProcedure(actor, formObject(fd))).id;
  });
  if (res?.ok) redirect(`/pops/${id}`);
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
