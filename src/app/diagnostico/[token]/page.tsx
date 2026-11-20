import { DiagnosisFields } from "@/components/diagnosis-fields";
import { submitPublicDiagnosisAction } from "@/app/actions/diagnosis";
import { diagnosisByToken } from "@/server/services/diagnosis";

export const metadata = { title: "Diagnóstico financeiro", robots: { index: false, follow: false } };

export default async function PublicDiagnosisPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const row = await diagnosisByToken(token);
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-900">Diagnóstico financeiro</h1>
      {!row ? (
        <p className="mt-4 rounded-xl border border-hair bg-white p-5 text-sm text-slate-600">Este link é inválido ou expirou. Peça um novo link para a Rosan Finanças.</p>
      ) : sp.ok ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">✅ Recebemos suas informações, {row.client.tradeName}. Obrigada! Você pode fechar esta página.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">Olá, {row.client.tradeName}! Preencha as informações abaixo para a gente entender a sua operação e montar a melhor proposta. Leva uns 5 minutos. Estimativas servem.</p>
          {sp.erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
          <form action={submitPublicDiagnosisAction.bind(null, token)} className="card mt-5 space-y-4 p-5">
            <DiagnosisFields d={row} simple />
            <button type="submit" className="btn-primary">Enviar informações</button>
          </form>
          <p className="mt-3 text-xs text-slate-500">Não pedimos senhas, logins nem dados de cartão.</p>
        </>
      )}
    </main>
  );
}
