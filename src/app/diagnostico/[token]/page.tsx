import Image from "next/image";
import { DiagnosisQuestionnaire } from "@/components/diagnosis-questionnaire";
import { submitPublicDiagnosisAction } from "@/app/actions/diagnosis";
import { ALL_QUESTIONS, DIAGNOSIS_SECTIONS, type Answers } from "@/domain/diagnosis-form";
import { diagnosisByToken } from "@/server/services/diagnosis";

export const metadata = { title: "Diagnóstico financeiro", robots: { index: false, follow: false } };

export default async function PublicDiagnosisPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const row = await diagnosisByToken(token);
  const answers = ((row?.answers ?? {}) as Answers) ?? {};
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="bg-brand-900 py-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4">
          <Image src="/logo.png" alt="Rosan Finanças" width={620} height={530} priority className="h-auto w-20" />
          <div className="text-white">
            <h1 className="text-xl font-semibold">Diagnóstico financeiro</h1>
            <p className="text-sm text-white/75">Rosan Finanças · BPO financeiro</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {!row ? (
          <p className="rounded-xl border border-hair bg-white p-5 text-sm text-slate-600">Este link é inválido ou expirou. Peça um novo link para a Rosan Finanças.</p>
        ) : sp.ok ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <h2 className="text-lg font-semibold">✅ Recebemos o seu diagnóstico!</h2>
            <p className="mt-1 text-sm">Obrigada, {row.client.tradeName}. Vamos analisar as informações e entrar em contato com a proposta. Você já pode fechar esta página.</p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-700">
              Olá, <strong>{row.client.tradeName}</strong>! Este diagnóstico nos ajuda a entender a sua operação e montar a proposta certa para o seu negócio. São {ALL_QUESTIONS.length} perguntas em {DIAGNOSIS_SECTIONS.length} etapas e leva cerca de 10 minutos. <strong>Todas as perguntas são obrigatórias</strong>; use estimativas quando não souber o número exato e escreva “Nenhum” ou digite 0 quando não se aplicar.
            </p>
            {sp.erro && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
            <form action={submitPublicDiagnosisAction.bind(null, token)} className="mt-5 space-y-5">
              <DiagnosisQuestionnaire answers={answers} required />
              <div className="flex flex-wrap items-center gap-4">
                <button type="submit" className="btn-primary px-6 py-2.5 text-base">Enviar diagnóstico</button>
                <p className="text-xs text-slate-500">🔒 Não pedimos senhas, logins nem dados de cartão.</p>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
