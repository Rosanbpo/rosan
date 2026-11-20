"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { recordNps } from "@/server/services/nps";

export async function recordNpsAction(clientId: string, fd: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) throw new Error("Não autorizado");
  let target = `/clientes/${clientId}?aba=resumo&nps=ok`;
  try {
    await recordNps(actor, clientId, Number(fd.get("score")), String(fd.get("comment") ?? ""));
  } catch (e) {
    unstable_rethrow(e);
    if (!(e instanceof ValidationError)) throw e;
    target = `/clientes/${clientId}?aba=resumo&npserro=${encodeURIComponent(e.message)}`;
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(target);
}
