"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { prisma } from "@/server/db";
import { assertClientAccess } from "@/server/services/access";
import { closeClientWithChurn } from "@/server/services/churn";
import { saveChecklist } from "@/server/services/checklists";

async function actorOrThrow() {
  const a = await getActor();
  if (!a) throw new Error("Não autorizado");
  return a;
}
const friendly = (e: unknown) => (e instanceof ValidationError || e instanceof NotFoundError ? e.message : null);

export async function closeClientAction(clientId: string, fd: FormData): Promise<void> {
  let target = "/churn";
  try {
    await closeClientWithChurn(await actorOrThrow(), clientId, { reason: fd.get("reason"), detail: fd.get("detail") });
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    target = `/clientes/${clientId}?aba=dados&dxerro=${encodeURIComponent(m)}`;
  }
  revalidatePath("/", "layout");
  redirect(target);
}

export async function saveChecklistAction(kind: "CLOSING" | "ONBOARDING", fd: FormData): Promise<void> {
  let q = "ok=1";
  try {
    await saveChecklist(await actorOrThrow(), kind, String(fd.get("items") ?? ""));
  } catch (e) {
    unstable_rethrow(e);
    const m = friendly(e);
    if (!m) throw e;
    q = `erro=${encodeURIComponent(m)}`;
  }
  redirect(`/configuracoes/checklists?${q}`);
}

export async function createNpsLinkAction(clientId: string): Promise<void> {
  const actor = await actorOrThrow();
  await assertClientAccess(actor, clientId);
  const token = randomBytes(24).toString("base64url");
  await prisma.npsLink.upsert({ where: { clientId }, create: { clientId, organizationId: actor.organizationId, token }, update: { token, createdAt: new Date() } });
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=resumo&nps=link`);
}

/** Resposta pública do cliente à pesquisa de satisfação. */
export async function submitPublicNpsAction(token: string, fd: FormData): Promise<void> {
  const link = token.length >= 20 ? await prisma.npsLink.findUnique({ where: { token } }) : null;
  if (!link) redirect(`/nps/${token}?erro=Link inválido`);
  const score = Number(fd.get("score"));
  if (!Number.isInteger(score) || score < 0 || score > 10) redirect(`/nps/${token}?erro=Escolha uma nota de 0 a 10`);
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 1000) || null;
  await prisma.clientNps.create({ data: { clientId: link.clientId, organizationId: link.organizationId, score, comment, source: "CLIENTE" } });
  redirect(`/nps/${token}?ok=1`);
}
