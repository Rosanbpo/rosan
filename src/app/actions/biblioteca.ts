"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import { deleteMaterial, saveMaterial } from "@/server/services/library";
import { addTrainingItem, removeTrainingItem, setTrainingDone } from "@/server/services/training";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const friendly = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);

export async function saveMaterialAction(id: string | null, fd: FormData): Promise<void> {
  let target = "/biblioteca?ok=1";
  try {
    await saveMaterial(await actorOrThrow(), id, formObject(fd));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    target = `/biblioteca?erro=${encodeURIComponent(m)}`;
  }
  redirect(target);
}

export async function deleteMaterialAction(id: string): Promise<void> {
  await deleteMaterial(await actorOrThrow(), id);
  revalidatePath("/biblioteca");
}

export async function toggleTrainingAction(itemId: string, done: boolean): Promise<void> {
  await setTrainingDone(await actorOrThrow(), itemId, done);
  revalidatePath("/equipe/trilha");
}

export async function addTrainingItemAction(fd: FormData): Promise<void> {
  let q = "";
  try {
    await addTrainingItem(await actorOrThrow(), String(fd.get("title") ?? ""), String(fd.get("description") ?? ""));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `?erro=${encodeURIComponent(m)}`;
  }
  redirect(`/equipe/trilha${q}`);
}

export async function removeTrainingItemAction(itemId: string): Promise<void> {
  await removeTrainingItem(await actorOrThrow(), itemId);
  revalidatePath("/equipe/trilha");
}
