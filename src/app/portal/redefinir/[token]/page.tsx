import { PortalPasswordForm } from "@/components/portal-forms";
import { findReset } from "@/server/services/portal-auth";
import { PortalBrand } from "@/components/portal-brand";

export const metadata = { title: "Nova senha" };
export const dynamic = "force-dynamic";

export default async function Redefinir({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const u = await findReset(token);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071938] px-4 py-10">
      <div className="w-full max-w-sm">
        <PortalBrand />
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          {u ? (
            <>
              <h1 className="mb-4 text-lg font-semibold text-[#071938]">Crie uma nova senha</h1>
              <PortalPasswordForm mode="redefinir" token={token} />
            </>
          ) : (
            <p role="alert" className="text-sm text-slate-700">Este link expirou. Peça um novo em “Esqueci minha senha”.</p>
          )}
        </div>
      </div>
    </main>
  );
}
