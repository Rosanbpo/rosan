"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/server/context";
import { ValidationError } from "@/domain/permissions";
import * as closings from "@/server/services/closings";
import * as logos from "@/server/services/client-logo";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const back = (clientId: string) => revalidatePath(`/clientes/${clientId}`);

export async function startClosingAction(clientId: string, month: string): Promise<void> {
  await closings.startClosing(await actorOrThrow(), clientId, month);
  back(clientId);
}

export async function toggleClosingItemAction(itemId: string, done: boolean): Promise<void> {
  const r = await closings.setClosingItemDone(await actorOrThrow(), itemId, done);
  back(r.clientId);
}

export async function addClosingItemAction(closingId: string, fd: FormData): Promise<void> {
  const r = await closings.addClosingItem(await actorOrThrow(), closingId, String(fd.get("label") ?? ""));
  back(r.clientId);
}

export async function removeClosingItemAction(itemId: string): Promise<void> {
  const r = await closings.removeClosingItem(await actorOrThrow(), itemId);
  back(r.clientId);
}

export async function uploadClientLogoAction(clientId: string, fd: FormData): Promise<void> {
  const f = fd.get("logo");
  if (!(f instanceof File) || f.size === 0) throw new ValidationError("Escolha uma imagem.");
  await logos.saveClientLogo(await actorOrThrow(), clientId, { type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) });
  revalidatePath("/clientes");
  back(clientId);
}

export async function removeClientLogoAction(clientId: string): Promise<void> {
  await logos.removeClientLogo(await actorOrThrow(), clientId);
  revalidatePath("/clientes");
  back(clientId);
}
