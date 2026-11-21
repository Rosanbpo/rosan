import Image from "next/image";
import { DiagnosisQuestionnaire } from "@/components/diagnosis-questionnaire";
import { submitPublicDiagnosisAction } from "@/app/actions/diagnosis";
import { type Answers } from "@/domain/diagnosis-form";
import { diagnosisByToken } from "@/server/services/diagnosis";

export const metadata = { title: "Diagnóstico financeiro", robots: { index: false, follow: false } };

export default async function PublicDiagnosisPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const row = await diagnosisByToken(token);
  const answers = ((row?.answers ?? {}) as Answers) ?? {};
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="bg-brand-900 py-7">
        <div className="mx-auto flex max-w-3xl items-center gap-5 px-4">
          <Image src="/logo.png" alt="Rosan Finanças" width={620} height={530} priority className="h-auto w-36 sm:w-44" />
          <div className="text-white">
            <h1 className="text-2xl font-semibold">Diagnóstico financeiro</h1>
            <p className="text-sm text-white/75">Rosan Finanças · BPO financeiro</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {!row ? (
          <p className="rounded-xl border border-hair bg-white p-5 text-sm text-slate-600">Este link é inválido ou expirou. Peça um novo link para a Rosan Finanças.</p>
        ) : sp.ok ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
            <div className="text-6xl" aria-hidden>🎉</div>
            <h2 className="mt-4 text-2xl font-bold text-brand-900">Recebemos o seu diagnóstico!</h2>
            <p className="mt-2 text-slate-700">Muito obrigada, <strong>{row.client.tradeName}</strong>. Suas respostas já estão com a nossa equipe.</p>
            <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-slate-700">
              <li className="flex gap-2"><span aria-hidden>🔎</span> Vamos analisar a sua operação com carinho.</li>
              <li className="flex gap-2"><span aria-hidden>📄</span> Em seguida montamos a proposta sob medida para o seu negócio.</li>
              <li className="flex gap-2"><span aria-hidden>💬</span> Entraremos em contato em breve para conversar.</li>
            </ul>
            <p className="mt-6 text-sm text-slate-500">Você já pode fechar esta página. Até logo! 💙</p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-700">
              Olá, <strong>{row.client.tradeName}</strong>! Este diagnóstico nos ajuda a entender a sua operação e montar a proposta certa para o seu negócio. Leva cerca de 10 minutos. Use estimativas quando não souber o número exato e escreva “Nenhum” ou digite 0 quando não se aplicar.
            </p>
            {sp.erro && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
            <form action={submitPublicDiagnosisAction.bind(null, token)} className="mt-5 space-y-5">
              <DiagnosisQuestionnaire answers={answers} required paged />
            </form>
          </>
        )}
      </main>
    </div>
  );
}
