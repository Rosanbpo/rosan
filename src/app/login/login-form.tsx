"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" autoFocus />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
