"use client";

import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { portalLoginAction, requestResetAction, acceptInviteAction, resetPasswordAction } from "@/app/portal/actions";

export function PortalLoginForm({ base }: { base: string }) {
  return (
    <ActionForm action={portalLoginAction} className="space-y-4">
      <Field label="E-mail" name="email" required>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" autoFocus />
      </Field>
      <Field label="Senha" name="password" required>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">Entrar</SubmitButton>
      <p className="text-center text-sm"><Link href={`${base}/esqueci`} className="text-[#6E4E40] underline">Esqueci minha senha</Link></p>
    </ActionForm>
  );
}

export function PortalPasswordForm({ mode, token }: { mode: "convite" | "redefinir"; token: string }) {
  const action = (mode === "convite" ? acceptInviteAction : resetPasswordAction).bind(null, token);
  return (
    <ActionForm action={action} className="space-y-4">
      <Field label="Nova senha" name="password" required hint="Mínimo de 10 caracteres.">
        <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className="input" autoFocus />
      </Field>
      <Field label="Repita a senha" name="confirm" required>
        <input id="confirm" name="confirm" type="password" minLength={10} required autoComplete="new-password" className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">{mode === "convite" ? "Criar senha e entrar" : "Salvar nova senha"}</SubmitButton>
    </ActionForm>
  );
}

export function PortalResetRequestForm() {
  return (
    <ActionForm action={requestResetAction} className="space-y-4">
      <Field label="Seu e-mail" name="email" required>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" autoFocus />
      </Field>
      <SubmitButton className="btn-primary w-full">Enviar link</SubmitButton>
    </ActionForm>
  );
}
