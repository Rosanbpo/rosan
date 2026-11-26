import { requirePortal } from "../actions";

export const metadata = { title: "Visão geral" };

export default async function PortalHome() {
  const s = await requirePortal();
  return (
    <>
      <h1 className="text-xl font-semibold text-[#071938]">Olá, {s.user.name.split(" ")[0]}!</h1>
      <p className="mt-1 text-sm text-slate-600">{s.clients.length === 1 ? s.clients[0]!.name : `${s.clients.length} empresas`}</p>
      <section className="mt-6 rounded-2xl border border-[#D2B37D]/50 bg-white p-6">
        <h2 className="font-semibold text-[#071938]">Seu acesso está ativo</h2>
        <p className="mt-1 text-sm text-slate-600">Em breve, as solicitações e os documentos da Rosan aparecerão aqui.</p>
      </section>
    </>
  );
}
