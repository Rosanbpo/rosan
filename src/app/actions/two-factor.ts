"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import * as tf from "@/server/services/two-factor";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: (actor: NonNullable<Awaited<ReturnType<typeof getActor>>>) => Promise<T>): Promise<Result<T>> {
  try {
    const actor = await getActor();
    if (!actor) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
    const data = await fn(actor);
    revalidatePath("/conta");
    revalidatePath("/configuracoes/usuarios");
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ValidationError || e instanceof ForbiddenError || e instanceof NotFoundError) return { ok: false, error: e.message };
    console.error("[2fa]", e);
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

export async function beginTwoFactorAction() {
  return safe((a) => tf.beginTwoFactorSetup(a));
}
export async function confirmTwoFactorAction(code: string) {
  return safe((a) => tf.confirmTwoFactorSetup(a, code));
}
export async function disableTwoFactorAction(password: string, code: string) {
  return safe((a) => tf.disableTwoFactor(a, password, code));
}
