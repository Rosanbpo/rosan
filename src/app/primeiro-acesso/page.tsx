import { redirect } from "next/navigation";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { APP_NAME } from "@/lib/app-config";
import { needsFirstSetup } from "@/server/services/setup";
import { firstSetupAction } from "./actions";

export const metadata = { title: "Primeiro acesso" };
export const dynamic = "force-dynamic";

export default async function FirstSetupPage() {
  if (!(await needsFirstSetup())) redirect("/login");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Bem-vindo à {APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure sua empresa e crie o usuário administrador. Esta tela aparece uma única vez.
          </p>
        </div>
        <div className="card p-6">
          <ActionForm action={firstSetupAction} className="space-y-4">
            <Field label="Nome da sua empresa de BPO" name="orgName" required>
              <input id="orgName" name="orgName" required className="input" autoFocus />
            </Field>
            <Field label="Seu nome" name="name" required>
              <input id="name" name="name" required className="input" autoComplete="name" />
            </Field>
            <Field label="Seu e-mail (será o login)" name="email" required>
              <input id="email" type="email" name="email" required className="input" autoComplete="email" />
            </Field>
            <Field label="Senha" name="password" required hint="Mínimo de 10 caracteres.">
              <input id="password" type="password" name="password" minLength={10} required className="input" autoComplete="new-password" />
            </Field>
            <Field label="Confirme a senha" name="confirm" required>
              <input id="confirm" type="password" name="confirm" minLength={10} required className="input" autoComplete="new-password" />
            </Field>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Também serão criados os 9 modelos de rotina iniciais (editáveis) e os feriados nacionais deste ano e do próximo.
            </p>
            <SubmitButton className="btn-primary w-full" pendingText="Configurando…">
              Criar empresa e administrador
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
