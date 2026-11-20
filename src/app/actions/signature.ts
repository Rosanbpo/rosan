"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireActor, requirePermission } from "@/server/context";
import { prisma } from "@/server/db";
import { emailSignLink } from "@/server/services/digest";
import { cancelSignLink, createSignLink, signByToken } from "@/server/services/signature";

export async function createSignLinkAction(contractId: string) {
  const actor = await requirePermission("contracts.manage");
  let erro = "";
  try {
    await createSignLink(actor, contractId);
  } catch (e) {
    unstable_rethrow(e);
    erro = e instanceof Error ? e.message : "Não foi possível gerar o link.";
  }
  revalidatePath(`/contratos/${contractId}`);
  redirect(`/contratos/${contractId}${erro ? `?erro=${encodeURIComponent(erro)}` : ""}`);
}

export async function cancelSignLinkAction(contractId: string) {
  const actor = await requirePermission("contracts.manage");
  await cancelSignLink(actor, contractId);
  revalidatePath(`/contratos/${contractId}`);
  redirect(`/contratos/${contractId}`);
}

export async function submitSignatureAction(token: string, fd: FormData) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip");
  let erro = "";
  try {
    await signByToken(token, { name: String(fd.get("name") ?? ""), cpf: String(fd.get("cpf") ?? ""), agree: fd.get("agree") === "on" }, { ip: ip || null, agent: h.get("user-agent") });
  } catch (e) {
    unstable_rethrow(e);
    erro = e instanceof Error ? e.message : "Não foi possível assinar.";
  }
  redirect(`/assinar/${token}${erro ? `?erro=${encodeURIComponent(erro)}` : "?ok=1"}`);
}

export async function emailSignLinkAction(contractId: string, fd: FormData) {
  const actor = await requirePermission("contracts.manage");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  let msg = "enviado=1";
  try {
    await emailSignLink(actor, contractId, String(fd.get("email") ?? "").trim(), origin);
  } catch (e) {
    unstable_rethrow(e);
    msg = `erro=${encodeURIComponent(e instanceof Error ? e.message : "Não foi possível enviar.")}`;
  }
  redirect(`/contratos/${contractId}?${msg}`);
}

export async function setDigestAction(fd: FormData) {
  const actor = await requireActor();
  await prisma.user.update({ where: { id: actor.userId }, data: { emailDigest: fd.get("on") === "on" } });
  revalidatePath("/conta");
  redirect("/conta?salvo=1");
}
