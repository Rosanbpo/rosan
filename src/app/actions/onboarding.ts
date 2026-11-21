"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import * as ob from "@/server/services/onboarding";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const to = (id: string, q: string) => `/clientes/${id}?aba=dados&${q}`;

export async function saveOnboardingAction(clientId: string, fd: FormData): Promise<void> {
  await ob.saveOnboarding(await actorOrThrow(), clientId, formObject(fd));
  revalidatePath(`/clientes/${clientId}`);
  redirect(to(clientId, "ob=salvo"));
}
