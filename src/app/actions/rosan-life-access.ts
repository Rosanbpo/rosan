"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/server/action-utils";
import { requirePermission } from "@/server/context";
import * as access from "@/server/services/rosan-life-access";

export async function requestRosanLifeAccessAction(
  clientId: string,
  _: ActionState,
): Promise<ActionState> {
  return runAction(async (a) => access.requestRosanLifeAccess(a, clientId), {
    revalidate: [`/clientes/${clientId}`],
  });
}

/** Abre o ROSAN LIFE real da cliente, já como consultora. Se não houver autorização ativa, volta à ficha com o aviso. */
export async function openRosanLifeAction(clientId: string) {
  const actor = await requirePermission("clients.manage");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  let url: string;
  try {
    url = await access.buildEntryUrl(
      actor,
      clientId,
      `${origin}/clientes/${clientId}?aba=rosanlife`,
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Não foi possível abrir o ROSAN LIFE.";
    redirect(
      `/clientes/${clientId}?aba=rosanlife&erro=${encodeURIComponent(msg)}`,
    );
  }
  redirect(url);
}
