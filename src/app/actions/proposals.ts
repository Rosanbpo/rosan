"use server";

import { redirect } from "next/navigation";
import type { ProposalStatus } from "@/domain/proposal";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as proposals from "@/server/services/proposals";

export async function createProposalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await proposals.createProposal(actor, formObject(fd))).id;
  });
  if (res?.ok) redirect(`/propostas/${id}`);
  return res;
}

export async function updateProposalAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await proposals.updateProposal(actor, id, formObject(fd));
  });
  if (res?.ok) redirect(`/propostas/${id}`);
  return res;
}

export async function setProposalStatusAction(id: string, status: ProposalStatus, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await proposals.setProposalStatus(actor, id, status);
    return "Situação da proposta atualizada.";
  });
}
