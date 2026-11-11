"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import * as documents from "@/server/services/documents";

export async function toggleDocumentAction(requirementId: string, competence: string, received: boolean): Promise<ActionState> {
  return runAction(async (actor) => {
    await documents.setReceived(actor, requirementId, competence, received);
    revalidatePath("/documentos");
  });
}

export async function addDocumentRequirementAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await documents.addRequirement(actor, clientId, String(fd.get("name") ?? ""), fd.get("required") !== "off");
    revalidatePath(`/clientes/${clientId}`);
    return "Documento incluído.";
  });
}

export async function applyDefaultDocumentsAction(clientId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const n = await documents.applyDefaultRequirements(actor, clientId);
    revalidatePath(`/clientes/${clientId}`);
    return n ? `${n} documentos incluídos.` : "A lista padrão já está completa.";
  });
}

export async function removeDocumentRequirementAction(clientId: string, id: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await documents.removeRequirement(actor, id);
    revalidatePath(`/clientes/${clientId}`);
    return "Documento removido da lista.";
  });
}
