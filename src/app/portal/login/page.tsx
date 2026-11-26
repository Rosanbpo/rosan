import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal-forms";
import { getPortalSession, portalPath } from "@/server/portal-session";
import { PortalBrand } from "@/components/portal-brand";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PortalLogin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getPortalSession()) redirect(portalPath("/portal"));
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071938] px-4 py-10">
      <div className="w-full max-w-sm">
        <PortalBrand />
        {sp.senha === "ok" && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Senha alterada. Entre com a nova senha.</p>}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="mb-4 text-lg font-semibold text-[#071938]">Acesse sua área</h1>
          <PortalLoginForm base={portalPath("/portal")} />
        </div>
        <p className="mt-4 text-center text-xs text-[#D2B37D]/80">Ambiente seguro. Seus dados e documentos são confidenciais.</p>
      </div>
    </main>
  );
}
