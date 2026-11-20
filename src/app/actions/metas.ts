"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import { saveGoals } from "@/server/services/goals";

export async function saveGoalsAction(fd: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) throw new Error("Não autorizado");
  let q = "ok=1";
  try {
    await saveGoals(actor, formObject(fd));
  } catch (e) {
    unstable_rethrow(e);
    if (!(e instanceof ValidationError)) throw e;
    q = `erro=${encodeURIComponent(e.message)}`;
  }
  redirect(`/metas?${q}`);
}
