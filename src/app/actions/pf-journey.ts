"use server";

import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as pf from "@/server/services/pf-journey";

const paths = (id: string) => ({ revalidate: [`/clientes/${id}`, "/rosan-life"] });

export async function savePfDatesAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (a) => { await pf.savePfDates(a, clientId, formObject(fd)); }, paths(clientId));
}
export async function setPfStatusAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (a) => { await pf.setPfStatus(a, clientId, String(fd.get("status") ?? "")); return "Status atualizado."; }, paths(clientId));
}
export async function setPfContinuityAction(clientId: string, value: string, _: ActionState): Promise<ActionState> {
  return runAction(async (a) => { await pf.setPfContinuity(a, clientId, value); return "Continuidade registrada."; }, paths(clientId));
}
export async function togglePfItemAction(clientId: string, key: string, _: ActionState): Promise<ActionState> {
  return runAction(async (a) => { await pf.togglePfItem(a, clientId, key); return "Item atualizado."; }, paths(clientId));
}

export async function inviteRosanLifeAction(clientId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (a) => {
    const r = await pf.inviteToRosanLife(a, clientId);
    return r.sent ? `Convite enviado para ${r.email}.` : `Convite criado, mas o e-mail não foi enviado. Copie e mande este link (vale 14 dias): ${r.link}`;
  }, paths(clientId));
}
