"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import { saveCulture } from "@/server/services/culture";

export async function saveCultureAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await saveCulture(actor, formObject(fd));
    revalidatePath("/cultura");
  });
  if (res?.ok) redirect("/cultura");
  return res;
}
