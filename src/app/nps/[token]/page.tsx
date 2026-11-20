import { submitPublicNpsAction } from "@/app/actions/gestao";
import { prisma } from "@/server/db";

export const metadata = { title: "Pesquisa de satisfação", robots: { index: false, follow: false } };

export default async function PublicNpsPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const link = token.length >= 20 ? await prisma.npsLink.findUnique({ where: { token }, include: { client: { select: { tradeName: true } } } }) : null;
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-900">Como estamos indo?</h1>
      {!link ? (
        <p className="mt-4 rounded-xl border border-hair bg-white p-5 text-sm text-slate-600">Este link é inválido. Peça um novo link para a Rosan Finanças.</p>
      ) : sp.ok ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">💙 Obrigada pelo retorno, {link.client.tradeName}! Sua opinião nos ajuda a melhorar.</p>
      ) : (
        <form action={submitPublicNpsAction.bind(null, token)} className="card mt-5 space-y-4 p-5">
          {sp.erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">De 0 a 10, o quanto você recomendaria a Rosan Finanças a um amigo ou colega?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, i) => (
                <label key={i} className="cursor-pointer">
                  <input type="radio" name="score" value={i} required className="peer sr-only" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-hair bg-white text-sm font-medium peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:ring-2">{i}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 flex justify-between text-xs text-slate-500"><span>Nada provável</span><span>Muito provável</span></p>
          </fieldset>
          <label className="block text-sm"><span className="font-medium text-slate-700">Quer deixar um comentário? (opcional)</span><textarea name="comment" rows={3} maxLength={1000} className="input mt-1" /></label>
          <button type="submit" className="btn-primary">Enviar</button>
        </form>
      )}
    </main>
  );
}
