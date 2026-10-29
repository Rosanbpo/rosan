import { redirect } from "next/navigation";
import { getActor } from "@/server/context";
import { APP_NAME } from "@/lib/app-config";
import { needsFirstSetup } from "@/server/services/setup";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await needsFirstSetup()) redirect("/primeiro-acesso");
  if (await getActor()) redirect("/");
  const { configurado } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            {APP_NAME.slice(0, 1)}
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{APP_NAME}</h1>
          <p className="text-sm text-slate-600">Operação de BPO Financeiro</p>
        </div>
        {configurado && (
          <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Empresa configurada! Entre com o e-mail e a senha que você acabou de criar.
          </p>
        )}
        <div className="card p-6">
          <LoginForm />
        </div>
        {showDemo && (
          <p className="mt-4 text-center text-xs text-slate-500">
            Ambiente de desenvolvimento: após rodar o seed, use <code>admin@demo.centralbpo.test</code> /{" "}
            <code>demo1234</code> (veja o README).
          </p>
        )}
      </div>
    </main>
  );
}
