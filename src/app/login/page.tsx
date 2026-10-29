import { redirect } from "next/navigation";
import { getActor } from "@/server/context";
import { APP_NAME } from "@/lib/app-config";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getActor()) redirect("/");
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
