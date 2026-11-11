"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as esteiras from "@/server/services/esteiras";

export async function applyEsteiraAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "";
  const res = await runAction(async (actor) => {
    const r = await esteiras.applyEsteira(actor, formObject(fd, { arrays: ["keys"] }));
    const clientId = String(fd.get("clientId"));
    dest = r.projectId ? `/projetos/${r.projectId}` : `/tarefas?clientId=${clientId}`;
  });
  if (res?.ok) {
    revalidatePath("/esteiras");
    redirect(dest);
  }
  return res;
}
