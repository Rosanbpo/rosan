"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/context";
import { disableFeed, getOrCreateFeedToken } from "@/server/services/agenda";
import { removeImport, saveImport } from "@/server/services/google-agenda";
import { createAppointment, deleteAppointment, updateAppointment } from "@/server/services/appointments";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";

export async function createFeedAction(regenerate: boolean) {
  const actor = await requirePermission("dashboard.view");
  await getOrCreateFeedToken(actor, regenerate);
  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function disableFeedAction() {
  const actor = await requirePermission("dashboard.view");
  await disableFeed(actor);
  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function saveImportAction(_: { error?: string } | undefined, formData: FormData) {
  const actor = await requirePermission("dashboard.view");
  try {
    await saveImport(actor, String(formData.get("url") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function removeImportAction() {
  const actor = await requirePermission("dashboard.view");
  await removeImport(actor);
  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function saveAppointmentAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    const input = formObject(fd);
    if (id) await updateAppointment(actor, id, input);
    else await createAppointment(actor, input);
    return "Compromisso salvo.";
  }, { revalidate: ["/agenda"] });
  if (res?.ok) redirect(`/agenda?dia=${String(fd.get("date") ?? "")}`);
  return res;
}

export async function deleteAppointmentAction(id: string) {
  const actor = await requirePermission("dashboard.view");
  await deleteAppointment(actor, id);
  revalidatePath("/agenda");
  redirect("/agenda");
}
