"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as notes from "@/server/services/client-notes";

const TAB = { PARTICULARIDADE: "particularidades", ATA: "atas" } as const;

export async function createClientNoteAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let kind: keyof typeof TAB = "PARTICULARIDADE";
  const res = await runAction(async (actor) => {
    kind = (await notes.createClientNote(actor, clientId, formObject(fd))).kind;
  });
  if (res?.ok) redirect(`/clientes/${clientId}?aba=${TAB[kind]}`);
  return res;
}

export async function updateClientNoteAction(noteId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const res = await runAction(async (actor) => {
    const n = await notes.updateClientNote(actor, noteId, formObject(fd));
    target = `/clientes/${n.clientId}?aba=${TAB[n.kind]}`;
  });
  if (res?.ok) redirect(target);
  return res;
}

export async function deleteClientNoteAction(clientId: string, noteId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await notes.deleteClientNote(actor, noteId);
    revalidatePath(`/clientes/${clientId}`);
    return "Registro removido.";
  });
}
