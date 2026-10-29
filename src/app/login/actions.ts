"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(_: string | null, fd: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirectTo: "/",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) return "E-mail ou senha inválidos, ou usuário sem acesso ativo.";
    throw error;
  }
}
