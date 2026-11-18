"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState {
  error: string | null;
  needsCode: boolean;
}

export async function loginAction(_: LoginState, fd: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      code: fd.get("code") ?? "",
      redirectTo: "/",
    });
    return { error: null, needsCode: false };
  } catch (error) {
    if (error instanceof AuthError) {
      if ((error as { code?: string }).code === "2fa_required") return { error: null, needsCode: true };
      const hadCode = !!String(fd.get("code") ?? "").trim();
      return { error: hadCode ? "Código inválido ou bloqueado por tentativas. Tente de novo em instantes." : "E-mail ou senha inválidos, ou usuário sem acesso ativo.", needsCode: hadCode };
    }
    throw error;
  }
}
