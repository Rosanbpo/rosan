"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { formObject, runAction } from "@/server/action-utils";
import * as clients from "@/server/services/clients";
import { importClientsCsv } from "@/server/services/clients-import";

const ARRAYS = ["services", "memberIds"];

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await clients.createClient(actor, formObject(fd, { arrays: ARRAYS }))).id;
  });
  if (res?.ok) redirect(`/clientes/${id}`);
  return res;
}

export async function updateClientAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await clients.updateClient(actor, clientId, formObject(fd, { arrays: ARRAYS }));
  });
  if (res?.ok) redirect(`/clientes/${clientId}?aba=dados&salvo=1`);
  return res;
}

export async function archiveClientAction(clientId: string, archived: boolean, _: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    await clients.setClientArchived(actor, clientId, archived);
    return archived ? "Cliente arquivado." : "Cliente reativado.";
  });
}

export async function importClientsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async (actor) => {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ValidationError("Escolha a planilha (.csv).");
    if (file.size > 2_000_000) throw new ValidationError("Arquivo muito grande (máximo 2 MB).");
    const r = await importClientsCsv(actor, await file.text());
    revalidatePath("/clientes");
    const errs = r.errors.length ? ` ${r.errors.length} linha(s) com erro: ${r.errors.slice(0, 5).map((e) => `linha ${e.line}: ${e.message}`).join(" | ")}${r.errors.length > 5 ? " …" : ""}` : "";
    return `${r.created} cliente(s) importado(s).${errs}`;
  });
}

export async function deleteClientAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let ok = false;
  const res = await runAction(async (actor) => {
    await clients.deleteClient(actor, clientId, String(fd.get("password") ?? ""));
    ok = true;
  });
  if (ok) redirect("/clientes");
  return res;
}
