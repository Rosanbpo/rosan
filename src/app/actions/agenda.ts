"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/context";
import { disableFeed, getOrCreateFeedToken } from "@/server/services/agenda";

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
