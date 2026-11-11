"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import type { ContractStatus } from "@/domain/contract";
import { formObject, runAction } from "@/server/action-utils";
import * as contracts from "@/server/services/contracts";

const JSON_FIELDS = { json: ["clauses", "distratoClauses"] };

export async function createContractAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await contracts.createContract(actor, formObject(fd, JSON_FIELDS))).id;
  });
  if (res?.ok) redirect(`/contratos/${id}`);
  return res;
}

export async function updateContractAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await contracts.updateContract(actor, id, formObject(fd, JSON_FIELDS));
  });
  if (res?.ok) redirect(`/contratos/${id}`);
  return res;
}

export async function setContractStatusAction(id: string, status: ContractStatus, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await contracts.setContractStatus(actor, id, status);
    return "Situação atualizada.";
  });
}

export async function startDistratoAction(id: string, _: ActionState): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await contracts.startDistrato(actor, id);
  });
  if (res?.ok) redirect(`/contratos/${id}/distrato`);
  return res;
}

export async function updateDistratoAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await contracts.updateDistrato(actor, id, formObject(fd, JSON_FIELDS));
  });
  if (res?.ok) redirect(`/contratos/${id}`);
  return res;
}

export async function removeDistratoAction(id: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await contracts.removeDistrato(actor, id);
    return "Distrato removido.";
  });
}
