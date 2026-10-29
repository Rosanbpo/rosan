"use server";

import { redirect } from "next/navigation";
import { ValidationError } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { performFirstSetup } from "@/server/services/setup";

export async function firstSetupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("password") !== fd.get("confirm")) {
    return { ok: false, error: "As senhas não conferem.", fieldErrors: { confirm: "As senhas não conferem." }, at: Date.now() };
  }
  try {
    await performFirstSetup(Object.fromEntries(fd));
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors, at: Date.now() };
    console.error("[primeiro-acesso]", error);
    return { ok: false, error: "Não foi possível concluir. Tente novamente.", at: Date.now() };
  }
  redirect("/login?configurado=1");
}
