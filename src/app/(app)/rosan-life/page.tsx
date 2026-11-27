import Link from "next/link";
import { PF_STATUS_LABEL } from "@/domain/pf-journey";
import { PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/context";
import { listPfClients } from "@/server/services/pf-journey";

export const metadata = { title: "ROSAN LIFE" };

const br = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

/** Gestão do ROSAN LIFE: clientes da Consultoria PF, convites, painel da consultora e demonstração. */
export default async function RosanLifePage() {
  const actor = await requirePermission("clients.manage");
  const rows = await listPfClients(actor);
  const base = (process.env.ROSAN_LIFE_URL ?? "").replace(/\/$/, "");
  const link = (path: string) => (base ? `${base}${path}` : null);
  const invites = link("/convites");
  return (
    <>
      <PageHeader title="ROSAN LIFE" description="Aplicativo de organização financeira pessoal dos clientes da Consultoria PF." />
      <div className="mb-5 grid gap-3">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Convites de acesso</h2>
          <p className="mt-1 text-sm text-slate-600">O cliente só cria conta no app com um convite seu. Envie pela aba Consultoria PF de cada cliente; aqui você vê e revoga os convites.</p>
          {invites ? <a href={invites} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex">Ver convites no app</a> : <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Falta configurar o endereço do app (variável ROSAN_LIFE_URL).</p>}
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold">Clientes da Consultoria PF</h2>
      {rows.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">Nenhum cliente de Consultoria PF ainda. Ao cadastrar um cliente, marque <b>Consultoria Financeira Pessoa Física</b> em Serviço contratado. <Link href="/clientes/novo" className="text-brand-700 hover:underline">Novo cliente</Link></p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="p-3">Cliente</th><th className="p-3">Status</th><th className="p-3">30 dias</th><th className="p-3">Bônus do app até</th><th className="p-3">Pago</th><th className="p-3">Convite</th></tr></thead>
            <tbody className="divide-y divide-hair">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3"><Link href={`/clientes/${r.id}?aba=consultoria`} className="font-medium text-brand-700 hover:underline">{r.name}</Link><div className="text-xs text-slate-500">{r.email ?? "sem e-mail"}</div></td>
                  <td className="p-3">{PF_STATUS_LABEL[r.status]}</td>
                  <td className="p-3">{br(r.startDate)} a {br(r.endDate)}</td>
                  <td className="p-3">{br(r.appBonusEnd)}</td>
                  <td className="p-3">{r.paid ? "Sim" : "Não"}</td>
                  <td className="p-3">{r.appInvitedAt ? "Enviado" : "Pendente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
