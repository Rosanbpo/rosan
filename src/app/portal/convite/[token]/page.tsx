import { PortalPasswordForm } from "@/components/portal-forms";
import { findInvite } from "@/server/services/portal-auth";
import { PortalBrand } from "@/components/portal-brand";

export const metadata = { title: "Criar senha" };
export const dynamic = "force-dynamic";

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const u = await findInvite(token);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071938] px-4 py-10">
      <div className="w-full max-w-sm">
        <PortalBrand />
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          {u ? (
            <>
              <h1 className="text-lg font-semibold text-[#071938]">Olá, {u.name.split(" ")[0]}!</h1>
              <p className="mb-4 mt-1 text-sm text-slate-600">Crie a senha do seu acesso ao portal.</p>
              <PortalPasswordForm mode="convite" token={token} />
            </>
          ) : (
            <p role="alert" className="text-sm text-slate-700">Este convite expirou ou já foi usado. Peça um novo link à Rosan Finanças.</p>
          )}
        </div>
      </div>
    </main>
  );
}
