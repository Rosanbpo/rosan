import Image from "next/image";
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
    <main className="flex min-h-screen items-center justify-center bg-brand-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt={APP_NAME} width={620} height={530} priority className="h-auto w-56" />
          <p className="-mt-2 text-xs tracking-[0.2em] text-brand-200/80 uppercase">Escritório virtual</p>
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
          <p className="mt-4 text-center text-xs text-slate-400">
            Ambiente de desenvolvimento: após rodar o seed, use <code>admin@demo.centralbpo.test</code> /{" "}
            <code>demo1234</code> (veja o README).
          </p>
        )}
      </div>
    </main>
  );
}
