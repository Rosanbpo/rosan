"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
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
