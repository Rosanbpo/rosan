"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import * as ob from "@/server/services/onboarding";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const to = (id: string, q: string) => `/clientes/${id}?aba=onboarding&${q}`;
const msg = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);

export async function saveOnboardingAction(clientId: string, fd: FormData): Promise<void> {
  await ob.saveOnboarding(await actorOrThrow(), clientId, formObject(fd));
  revalidatePath(`/clientes/${clientId}`);
  redirect(to(clientId, "ob=salvo"));
}

export async function createOnboardingTasksAction(clientId: string): Promise<void> {
  let target = to(clientId, "ob=tarefas");
  try {
    await ob.createOnboardingTasks(await actorOrThrow(), clientId);
  } catch (e) {
    unstable_rethrow(e);
    const m = msg(e);
    if (!m) throw e;
    target = to(clientId, `oberro=${encodeURIComponent(m)}`);
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(target);
}
