"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { formObject, runAction } from "@/server/action-utils";
import * as procedures from "@/server/services/procedures";

export async function createProcedureAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  let clientId: string | null = null;
  const res = await runAction(async (actor) => {
    const row = await procedures.createProcedure(actor, formObject(fd));
    id = row.id;
    clientId = row.clientId;
  });
  if (res?.ok) redirect(clientId ? `/clientes/${clientId}?aba=pops` : `/pops/${id}`);
  return res;
}

export async function updateProcedureAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async (actor) => {
    await procedures.updateProcedure(actor, id, formObject(fd));
  });
  if (res?.ok) redirect(`/pops/${id}`);
  return res;
}

export async function importPopLibraryAction(_: ActionState): Promise<ActionState> {
  return runAction(async (actor) => {
    const r = await procedures.importPopLibrary(actor);
    revalidatePath("/pops");
    return r.created ? `${r.created} processo(s) importado(s).` : "Todos os processos já estavam importados.";
  });
}

export async function copyProcedureToClientAction(clientId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    id = (await procedures.copyProcedureToClient(actor, String(fd.get("procedureId") ?? ""), clientId)).id;
  });
  if (res?.ok) redirect(`/pops/${id}/editar`);
  return res;
}

/** Cria um POP a partir de um pacote .zip já enviado (as imagens já estão no sistema). */
export async function importPopPackageAction(pkg: {
  title: string; category: string; objective?: string; tools?: string; responsible?: string; clientName?: string; content: string;
}): Promise<ActionState> {
  let id = "";
  const res = await runAction(async (actor) => {
    let clientId = "";
    if (pkg.clientName) {
      const c = await prisma.client.findFirst({ where: { organizationId: actor.organizationId, tradeName: pkg.clientName, archivedAt: null }, select: { id: true } });
      if (!c) throw new ValidationError(`Cliente "${pkg.clientName}" não encontrado.`);
      clientId = c.id;
    }
    const row = await procedures.createProcedure(actor, { ...pkg, clientId, status: "RASCUNHO" });
    id = row.id;
    return "POP criado como rascunho.";
  });
  return res?.ok ? { ...res, message: id } : res;
}
