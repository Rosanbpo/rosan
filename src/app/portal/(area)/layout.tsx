import { portalLogoutAction, requirePortal } from "../actions";

export const dynamic = "force-dynamic";

export default async function PortalArea({ children }: { children: React.ReactNode }) {
  const s = await requirePortal();
  return (
    <>
      <header className="bg-[#071938] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm tracking-[0.2em] text-[#D2B37D]">ROSAN FINANÇAS</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/80 sm:inline">{s.user.name}</span>
            <form action={portalLogoutAction}><button className="rounded-lg border border-white/30 px-3 py-1.5 hover:bg-white/10">Sair</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </>
  );
}
