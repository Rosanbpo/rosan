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

export async function saveEsteiraAction(slug: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await esteiras.saveEsteiraText(actor, slug, String(fd.get("text") ?? ""));
  });
  if (res?.ok) {
    revalidatePath("/", "layout");
    redirect(`/esteiras/${slug}?salva=1`);
  }
  return res;
}

export async function resetEsteiraAction(slug: string) {
  await runAction(async (actor) => {
    await esteiras.resetEsteira(actor, slug);
  });
  revalidatePath("/esteiras");
  redirect(`/esteiras/${slug}`);
}
