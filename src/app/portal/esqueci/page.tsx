import Link from "next/link";
import { PortalResetRequestForm } from "@/components/portal-forms";
import { portalPath } from "@/server/portal-session";
import { PortalBrand } from "@/components/portal-brand";

export const metadata = { title: "Esqueci minha senha" };

export default function Esqueci() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071938] px-4 py-10">
      <div className="w-full max-w-sm">
        <PortalBrand />
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="mb-1 text-lg font-semibold text-[#071938]">Esqueci minha senha</h1>
          <p className="mb-4 text-sm text-slate-600">Informe o e-mail do seu acesso e enviaremos um link para criar uma nova senha.</p>
          <PortalResetRequestForm />
          <p className="mt-4 text-center text-sm"><Link href={portalPath("/portal/login")} className="text-[#6E4E40] underline">Voltar</Link></p>
        </div>
      </div>
    </main>
  );
}
