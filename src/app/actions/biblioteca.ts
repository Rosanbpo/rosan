"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import { deleteMaterial, deleteSharedMessage, resetSystemMessage, saveAccess, saveMaterial, saveSharedMessage, saveSystemMessage } from "@/server/services/library";
import { setReview } from "@/server/services/structure";
import { addTrainingItem, moveTrainingItem, removeTrainingItem, setTrainingDone, updateTrainingItem } from "@/server/services/training";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const friendly = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);

export async function saveMaterialAction(id: string | null, fd: FormData): Promise<void> {
  const back = String(fd.get("secao") ?? "materiais");
  let target = `/biblioteca?secao=${back}&ok=1`;
  try {
    await saveMaterial(await actorOrThrow(), id, formObject(fd));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    target = `/biblioteca?secao=${back}&erro=${encodeURIComponent(m)}`;
  }
  redirect(target);
}

export async function deleteMaterialAction(id: string): Promise<void> {
  await deleteMaterial(await actorOrThrow(), id);
  revalidatePath("/biblioteca");
}

export async function toggleTrainingAction(itemId: string, done: boolean): Promise<void> {
  await setTrainingDone(await actorOrThrow(), itemId, done);
  revalidatePath("/biblioteca");
}

export async function addTrainingItemAction(fd: FormData): Promise<void> {
  let q = "";
  try {
    await addTrainingItem(await actorOrThrow(), String(fd.get("title") ?? ""), String(fd.get("description") ?? ""), { phase: String(fd.get("phase") ?? ""), url: String(fd.get("url") ?? "") });
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `?erro=${encodeURIComponent(m)}`;
  }
  redirect(`/biblioteca?secao=trilha${q.replace('?', '&')}`);
}

export async function removeTrainingItemAction(itemId: string): Promise<void> {
  await removeTrainingItem(await actorOrThrow(), itemId);
  revalidatePath("/biblioteca");
}

/** Executa uma alteração da Biblioteca e volta para a área certa, com aviso de sucesso ou erro. */
async function lib(secao: string, fn: (a: Awaited<ReturnType<typeof actorOrThrow>>) => Promise<void>, base = "/biblioteca"): Promise<void> {
  let q = "ok=1";
  try {
    await fn(await actorOrThrow());
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `erro=${encodeURIComponent(m)}`;
  }
  redirect(base === "/biblioteca" ? `/biblioteca?secao=${secao}&${q}` : `${base}?${q}`);
}

export async function saveAccessAction(userId: string, fd: FormData): Promise<void> {
  return lib("acessos", (a) => saveAccess(a, userId, fd.getAll("sections").map(String)));
}
export async function saveSystemMessageAction(key: string, fd: FormData): Promise<void> {
  return lib("mensagens", (a) => saveSystemMessage(a, key, formObject(fd)));
}
export async function resetSystemMessageAction(key: string): Promise<void> {
  return lib("mensagens", (a) => resetSystemMessage(a, key));
}
export async function saveSharedMessageAction(id: string | null, fd: FormData): Promise<void> {
  return lib("mensagens", (a) => saveSharedMessage(a, id, formObject(fd)));
}
export async function deleteSharedMessageAction(id: string): Promise<void> {
  return lib("mensagens", (a) => deleteSharedMessage(a, id));
}
export async function updateTrainingItemAction(itemId: string, fd: FormData): Promise<void> {
  return lib("trilha", (a) => updateTrainingItem(a, itemId, formObject(fd)), "/biblioteca");
}
export async function moveTrainingItemAction(itemId: string, dir: number): Promise<void> {
  await moveTrainingItem(await actorOrThrow(), itemId, dir < 0 ? -1 : 1);
  revalidatePath("/biblioteca");
  revalidatePath("/biblioteca");
}

export async function setReviewAction(fd: FormData): Promise<void> {
  const area = String(fd.get("area") ?? "");
  const filtro = String(fd.get("filtro") ?? "");
  let q = "";
  try {
    await setReview(await actorOrThrow(), String(fd.get("key") ?? ""), String(fd.get("status") ?? ""), String(fd.get("note") ?? ""));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `&erro=${encodeURIComponent(m)}`;
  }
  redirect(`/biblioteca?secao=visao${filtro ? `&filtro=${filtro}` : ""}${q}#${area}`);
}
