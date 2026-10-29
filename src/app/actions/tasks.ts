"use server";

import { redirect } from "next/navigation";
import { TASK_ACTIONS, type TaskAction } from "@/domain/task-rules";
import { ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as tasks from "@/server/services/tasks";
import { updatePendingFollowUp } from "@/server/services/pendings";

export async function createTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    const task = await tasks.createTask(actor, formObject(fd, { json: ["checklist"] }));
    id = task.id;
  });
  if (res?.ok) redirect(`/tarefas/${id}?criada=1`);
  return res;
}

export async function updateTaskAction(taskId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.updateTask(actor, taskId, formObject(fd));
    return "Tarefa atualizada.";
  });
}

export async function transitionAction(taskId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const action = String(fd.get("action")) as TaskAction;
    if (!TASK_ACTIONS.includes(action)) throw new ValidationError("Ação inválida.");
    const result = await tasks.transitionTask(actor, taskId, action, {
      note: (fd.get("note") as string) || null,
      followUpDate: (fd.get("followUpDate") as string) || null,
      respondent: (fd.get("respondent") as string) || null,
    });
    return `Status atualizado: ${result.status === "CONCLUIDA" ? "tarefa concluída" : "ok"}.`;
  });
}

export async function addChecklistItemAction(taskId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.addChecklistItem(actor, taskId, String(fd.get("label") ?? ""), fd.get("required") === "on");
    return "Item incluído.";
  });
}

export async function toggleChecklistItemAction(itemId: string, done: boolean): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.toggleChecklistItem(actor, itemId, done);
  });
}

export async function removeChecklistItemAction(itemId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.removeChecklistItem(actor, itemId);
    return "Item removido.";
  });
}

export async function addCommentAction(taskId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.addComment(actor, taskId, String(fd.get("body") ?? ""));
    return "Comentário registrado.";
  });
}

export async function addEvidenceAction(taskId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.addEvidence(actor, taskId, String(fd.get("url") ?? ""), String(fd.get("description") ?? ""));
    return "Evidência adicionada.";
  });
}

export async function removeEvidenceAction(evidenceId: string, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await tasks.removeEvidence(actor, evidenceId);
    return "Evidência removida.";
  });
}

export async function updatePendingAction(pendingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await updatePendingFollowUp(actor, pendingId, {
      followUpDate: String(fd.get("followUpDate") ?? ""),
      respondent: (fd.get("respondent") as string) || null,
      note: (fd.get("note") as string) || null,
    });
    return "Acompanhamento atualizado.";
  });
}
