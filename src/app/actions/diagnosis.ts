"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ValidationError, NotFoundError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { formObject } from "@/server/action-utils";
import * as dx from "@/server/services/diagnosis";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const msg = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);
const dados = (clientId: string, q = "") => `/clientes/${clientId}?aba=dados${q}`;

export async function saveDiagnosisAction(clientId: string, fd: FormData): Promise<void> {
  let target = dados(clientId, "&dx=salvo");
  try {
    await dx.saveDiagnosis(await actorOrThrow(), clientId, formObject(fd));
  } catch (e) {
    unstable_rethrow(e);
    const m = msg(e);
    if (!m) throw e;
    target = dados(clientId, `&dxerro=${encodeURIComponent(m)}`);
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(target);
}

export async function createDiagnosisLinkAction(clientId: string): Promise<void> {
  await dx.createDiagnosisLink(await actorOrThrow(), clientId);
  revalidatePath(`/clientes/${clientId}`);
  redirect(dados(clientId, "&dx=link"));
}

export async function revokeDiagnosisLinkAction(clientId: string): Promise<void> {
  await dx.revokeDiagnosisLink(await actorOrThrow(), clientId);
  revalidatePath(`/clientes/${clientId}`);
  redirect(dados(clientId));
}

export async function saveVolumeAction(clientId: string, fd: FormData): Promise<void> {
  let target = dados(clientId, "&dx=volume");
  try {
    await dx.saveVolume(await actorOrThrow(), clientId, String(fd.get("month") ?? ""), { statementLines: fd.get("statementLines"), entries: fd.get("entries"), notes: fd.get("notes") });
  } catch (e) {
    unstable_rethrow(e);
    const m = msg(e);
    if (!m) throw e;
    target = dados(clientId, `&dxerro=${encodeURIComponent(m)}`);
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(target);
}

/** Salva no cliente o diagnóstico e a mensalidade definidos na precificação. */
export async function recordPricingAction(clientId: string, payload: { diagnosis: Record<string, unknown>; fee: number; hours: number }): Promise<{ ok: boolean; error?: string }> {
  try {
    await dx.recordPricing(await actorOrThrow(), clientId, payload.diagnosis, { fee: payload.fee, hours: payload.hours });
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true };
  } catch (e) {
    const m = msg(e);
    if (!m) throw e;
    return { ok: false, error: m };
  }
}

/** Resposta pública do cliente (sem login; protegida pelo token do link). */
export async function submitPublicDiagnosisAction(token: string, fd: FormData): Promise<void> {
  let target = `/diagnostico/${token}?ok=1`;
  try {
    await dx.submitDiagnosisByToken(token, formObject(fd));
  } catch (e) {
    unstable_rethrow(e);
    const m = msg(e);
    if (!m) throw e;
    target = `/diagnostico/${token}?erro=${encodeURIComponent(m)}`;
  }
  redirect(target);
}
