"use server";

import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import * as reminders from "@/server/services/client-reminders";

const REVALIDATE = { revalidate: ["layout"] };

export async function addReminderAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await reminders.addReminder(actor, clientId, String(fd.get("text") ?? ""));
    return "Lembrete salvo.";
  }, REVALIDATE);
}

export async function toggleReminderAction(id: string, done: boolean): Promise<ActionState> {
  return runAction(async (actor) => {
    await reminders.setReminderDone(actor, id, done);
  }, REVALIDATE);
}

export async function deleteReminderAction(id: string): Promise<ActionState> {
  return runAction(async (actor) => {
    await reminders.deleteReminder(actor, id);
    return "Lembrete removido.";
  }, REVALIDATE);
}

export async function reminderToTaskAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    await reminders.reminderToTask(actor, id, String(fd.get("dueDate") ?? ""));
    return "Tarefa criada a partir do lembrete.";
  }, REVALIDATE);
}
