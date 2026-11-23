"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { ValidationError } from "@/domain/permissions";
import { runAction } from "@/server/action-utils";
import * as marketing from "@/server/services/marketing";

const REVALIDATE = { revalidate: ["layout"] };
const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createIdeaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    const row = await marketing.createIdea(actor, { title: field(fd, "title"), pillar: field(fd, "pillar") as never, status: "IDEIA", notes: field(fd, "notes") });
    id = row.id;
  }, REVALIDATE);
  if (res?.ok && id) redirect(`/marketing/${id}`);
  return res;
}

export async function updateIdeaAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.updateIdea(actor, id, {
      title: field(fd, "title"),
      pillar: field(fd, "pillar") as never,
      status: field(fd, "status") as never,
      slidesText: field(fd, "slidesText"),
      caption: field(fd, "caption"),
      hashtags: field(fd, "hashtags"),
      notes: field(fd, "notes"),
      publishOn: field(fd, "publishOn"),
    });
    return "Conteúdo salvo.";
  }, REVALIDATE);
}

export async function setIdeaStatusAction(id: string, status: string): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.setIdeaStatus(actor, id, status);
  }, REVALIDATE);
}

export async function deleteIdeaAction(id: string): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await marketing.deleteIdea(actor, id);
  }, REVALIDATE);
  if (res?.ok) redirect("/marketing");
  return res;
}

export async function importLibraryAction(_: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const n = await marketing.importLibrary(actor);
    return n ? `${n} conteúdos importados.` : "Tudo já estava importado.";
  }, REVALIDATE);
}

export async function saveBrandAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.saveBrand(actor, {
      navy: field(fd, "navy"),
      gold: field(fd, "gold"),
      cream: field(fd, "cream"),
      brown: field(fd, "brown"),
      titleFont: field(fd, "titleFont"),
      bodyFont: field(fd, "bodyFont"),
      style: field(fd, "style"),
      guidelines: field(fd, "guidelines"),
    });
    return "Identidade salva. Os próximos slides já usam estas escolhas.";
  }, REVALIDATE);
}

export async function uploadPhotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new ValidationError("Escolha ao menos uma foto.");
    for (const f of files) await marketing.addPhoto(actor, { name: f.name, mime: f.type, data: Buffer.from(await f.arrayBuffer()) });
    return files.length === 1 ? "Foto adicionada." : `${files.length} fotos adicionadas.`;
  }, REVALIDATE);
}

export async function deletePhotoAction(id: string): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.deletePhoto(actor, id);
    return "Foto apagada.";
  }, REVALIDATE);
}

export async function setIdeaPhotoAction(ideaId: string, photoId: string): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.setIdeaPhoto(actor, ideaId, photoId);
    return photoId ? "Foto da capa escolhida." : "Foto da capa removida.";
  }, REVALIDATE);
}

export async function importCalendarAction(): Promise<ActionState> {
  return runAction(async (actor) => {
    const n = await marketing.importCalendar(actor);
    return `Calendário carregado com ${n} conteúdos.`;
  }, REVALIDATE);
}

export async function setApprovedAction(id: string, approved: boolean): Promise<ActionState> {
  return runAction(async (actor) => {
    await marketing.setApproved(actor, id, approved);
  }, REVALIDATE);
}

export async function approveAllAction(): Promise<ActionState> {
  return runAction(async (actor) => {
    const n = await marketing.approveAll(actor);
    return n === 0 ? "Tudo já estava aprovado." : `${n} conteúdos aprovados.`;
  }, REVALIDATE);
}
