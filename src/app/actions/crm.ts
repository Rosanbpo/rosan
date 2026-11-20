"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { getActor } from "@/server/context";
import { formObject, runAction } from "@/server/action-utils";
import * as leads from "@/server/services/leads";

const ARRAYS = ["servicesInterest"];

export async function createLeadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await leads.createLead(actor, formObject(fd, { arrays: ARRAYS }))).id;
  });
  if (res?.ok) redirect(`/crm/${id}`);
  return res;
}

export async function updateLeadAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await leads.updateLead(actor, id, formObject(fd, { arrays: ARRAYS }));
  });
  if (res?.ok) redirect(`/crm/${id}`);
  return res;
}

export async function changeLeadStageAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await leads.changeLeadStage(actor, id, formObject(fd));
    return "Etapa atualizada.";
  });
}

export async function addLeadActivityAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await leads.addLeadActivity(actor, id, formObject(fd));
    return "Registro adicionado.";
  });
}

export async function convertLeadAction(id: string, _: ActionState): Promise<ActionState> {
  let clientId = "";
  const res = await runAction(async (actor) => {
    clientId = (await leads.convertLeadToClient(actor, id)).id;
  });
  if (res?.ok) redirect(`/clientes/${clientId}/editar`);
  return res;
}

/** Avança o lead para a próxima etapa direto do quadro (sem motivo de perda). */
export async function advanceLeadAction(id: string, stage: string): Promise<void> {
  const actor = await getActor();
  if (!actor) throw new Error("Não autorizado");
  await leads.changeLeadStage(actor, id, { stage });
  revalidatePath("/crm");
}
