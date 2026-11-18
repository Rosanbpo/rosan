"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null, needsCode: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {state.needsCode && (
        <div>
          <label htmlFor="code" className="label">
            Código de verificação
          </label>
          <input id="code" name="code" inputMode="text" autoComplete="one-time-code" required className="input tracking-widest" autoFocus placeholder="6 dígitos do aplicativo" />
          <p className="mt-1 text-xs text-slate-500">Abra o aplicativo autenticador. Sem o celular, use um código de recuperação.</p>
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {pending ? "Entrando…" : state.needsCode ? "Verificar e entrar" : "Entrar"}
      </button>
    </form>
  );
}
