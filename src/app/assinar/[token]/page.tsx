import { submitSignatureAction } from "@/app/actions/signature";
import { ContractDocument } from "@/components/contract-document";
import { maskCpf } from "@/domain/signature";
import { publicSignView } from "@/server/services/signature";

export const metadata = { title: "Assinar contrato", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "medium" });

export default async function SignPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const view = await publicSignView(token);
  if (!view)
    return <main className="mx-auto max-w-xl px-4 py-10"><p className="rounded-xl border border-hair bg-white p-5 text-sm text-slate-600">Este link é inválido. Peça um novo link para a Rosan Finanças.</p></main>;
  const { link, contract, org, changed, expired } = view;
  const signed = link.status === "ASSINADO";
  const blocked = link.status === "CANCELADO" ? "Este link foi cancelado. Peça um novo link para a Rosan Finanças." : expired ? "Este link expirou. Peça um novo link para a Rosan Finanças." : changed ? "O contrato foi alterado depois do envio. Peça um novo link para a Rosan Finanças." : null;
  return (
    <div className="min-h-screen bg-slate-300 py-6">
      <div className="mx-auto mb-4 w-[210mm] max-w-full px-2">
        <h1 className="text-xl font-semibold text-brand-900">Contrato {contract.number} · {org.name}</h1>
        {signed && (
          <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <h2 className="font-semibold">✅ Contrato assinado eletronicamente</h2>
            <dl className="mt-2 grid gap-1 sm:grid-cols-[9rem_1fr]">
              <dt className="text-emerald-800">Assinante</dt><dd>{link.signerName} · CPF {maskCpf(link.signerCpf ?? "")}</dd>
              <dt className="text-emerald-800">Data e hora</dt><dd>{link.signedAt ? fmt(link.signedAt) : ""}</dd>
              <dt className="text-emerald-800">Endereço IP</dt><dd>{link.signerIp ?? "não informado"}</dd>
              <dt className="text-emerald-800">Impressão digital</dt><dd className="break-all font-mono text-xs">{link.docHash}</dd>
            </dl>
            <p className="mt-2 text-xs text-emerald-800">A impressão digital (SHA-256) identifica o conteúdo exato do contrato assinado. Guarde esta página ou imprima em PDF como comprovante.</p>
          </section>
        )}
        {!signed && blocked && <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{blocked}</p>}
        {!signed && !blocked && (
          <form action={submitSignatureAction.bind(null, token)} className="card mt-3 space-y-3 p-5">
            <h2 className="text-sm font-semibold text-brand-900">✍️ Assinar este contrato</h2>
            <p className="text-sm text-slate-600">Leia o contrato abaixo. Para assinar, confirme seus dados e marque a caixa de aceite.</p>
            {sp.erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm"><span className="font-medium text-slate-700">Nome completo</span><input name="name" required maxLength={120} autoComplete="name" defaultValue={contract.repName ?? ""} className="input mt-1" /></label>
              <label className="block text-sm"><span className="font-medium text-slate-700">CPF</span><input name="cpf" required inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className="input mt-1" /></label>
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" className="mt-1" required /><span>Li o contrato e concordo com todos os seus termos. Reconheço que esta assinatura eletrônica, com registro de data, hora e endereço IP, tem validade entre as partes.</span></label>
            <button type="submit" className="btn-primary">Assinar contrato</button>
          </form>
        )}
      </div>
      <div className="overflow-x-auto"><ContractDocument contract={contract} issuer={org} /></div>
    </div>
  );
}
