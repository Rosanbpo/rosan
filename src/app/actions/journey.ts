"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { formObject } from "@/server/action-utils";
import { getActor } from "@/server/context";
import { applyJourneyStage, deleteAsset, saveAsset } from "@/server/services/journey";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const friendly = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);
const sep = (u: string) => (u.includes("?") ? "&" : "?");

/** Gera as tarefas de uma etapa da jornada para um cliente ou lead e volta para a mesma tela. */
export async function applyJourneyStageAction(fd: FormData): Promise<void> {
  const back = String(fd.get("back") ?? "/inicio");
  let q = "";
  try {
    const clientId = String(fd.get("clientId") ?? "");
    const leadId = String(fd.get("leadId") ?? "");
    const r = await applyJourneyStage(await actorOrThrow(), {
      slug: String(fd.get("slug")),
      stageIdx: Number(fd.get("stageIdx")),
      startDate: String(fd.get("startDate")),
      ownerId: String(fd.get("ownerId") ?? "") || undefined,
      clientId: clientId || undefined,
      leadId: leadId || undefined,
    });
    q = `gerou=${r.created}`;
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `erro=${encodeURIComponent(m)}`;
  }
  revalidatePath(back.split("?")[0]);
  redirect(`${back}${sep(back)}${q}`);
}

export async function saveAssetAction(id: string | null, fd: FormData): Promise<void> {
  let q = "ok=1";
  try {
    await saveAsset(await actorOrThrow(), id, formObject(fd, { arrays: ["taskRefs"] }));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `erro=${encodeURIComponent(m)}`;
  }
  redirect(`/biblioteca?secao=padroes&${q}`);
}

export async function deleteAssetAction(id: string): Promise<void> {
  await deleteAsset(await actorOrThrow(), id);
  revalidatePath("/biblioteca");
}
