"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as templates from "@/server/services/templates";
import * as recurrences from "@/server/services/recurrences";

const OPTS = { arrays: ["weekdays", "monthDays"], json: ["checklist"] };

export async function createTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await templates.createTemplate(actor, formObject(fd, OPTS))).id;
  });
  if (res?.ok) redirect(`/rotinas/modelos/${id}`);
  return res;
}

export async function updateTemplateAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await templates.updateTemplate(actor, id, formObject(fd, OPTS));
    return "Modelo atualizado. As próximas ocorrências usarão a nova versão.";
  });
}

export async function archiveTemplateAction(id: string, archived: boolean, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await templates.setTemplateArchived(actor, id, archived);
    return archived ? "Modelo arquivado." : "Modelo reativado.";
  });
}

export async function createRecurrenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await recurrences.createRecurrence(actor, formObject(fd, OPTS))).recurrence.id;
  });
  if (res?.ok) redirect(`/rotinas/recorrencias/${id}?criada=1`);
  return res;
}

export async function updateRecurrenceAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await recurrences.updateRecurrence(actor, id, formObject(fd, OPTS));
    return "Recorrência atualizada. A alteração vale para as próximas ocorrências.";
  });
}

export async function setRecurrenceStatusAction(
  id: string,
  status: "ACTIVE" | "PAUSED",
  _: ActionState,
): Promise<ActionState> {
  return runAction(async (actor) => {
    await recurrences.setRecurrenceStatus(actor, id, status);
    return status === "ACTIVE" ? "Recorrência reativada." : "Recorrência pausada.";
  });
}
