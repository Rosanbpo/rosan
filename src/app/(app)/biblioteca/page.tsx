import { PageHeader } from "@/components/ui/layout";
import { CopyButton } from "@/components/copy-button";
import { deleteMaterialAction, saveMaterialAction } from "@/app/actions/biblioteca";
import { can } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { listMaterials, MATERIAL_CATEGORIES } from "@/server/services/library";

export const metadata = { title: "Biblioteca" };

const EMOJI: Record<string, string> = { "Contratos e propostas": "📑", "E-mails e mensagens": "✉️", "Roteiros de reunião": "🎙️", "Planilhas e modelos": "📊", "Links úteis": "🔗", Outros: "📎" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const items = await listMaterials(actor, sp.q?.trim() || undefined);
  const manage = can(actor, "templates.manage");
  return (
    <>
      <PageHeader title="Biblioteca de materiais" description="Modelos de e-mail, roteiros de reunião, contratos, planilhas e links, tudo num lugar para reutilizar." />
      {sp.ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Material salvo.</p>}
      {sp.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
      <form className="card mb-5 flex gap-2 p-3"><input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por título ou conteúdo" className="input flex-1" /><button className="btn-secondary" type="submit">Buscar</button></form>

      {manage && (
        <details className="card mb-5 p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-900">➕ Novo material</summary>
          <form action={saveMaterialAction.bind(null, null)} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm"><span className="font-medium text-slate-700">Título</span><input name="title" required className="input mt-1" /></label>
            <label className="text-sm"><span className="font-medium text-slate-700">Categoria</span><select name="category" className="input mt-1">{MATERIAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-sm md:col-span-2"><span className="font-medium text-slate-700">Texto (modelo para copiar)</span><textarea name="body" rows={6} className="input mt-1" /></label>
            <label className="text-sm md:col-span-2"><span className="font-medium text-slate-700">Link (Google Drive, Canva, vídeo…)</span><input name="url" placeholder="https://" className="input mt-1" /></label>
            <div><button type="submit" className="btn-primary">Salvar material</button></div>
          </form>
        </details>
      )}

      {items.length === 0 ? <p className="card p-5 text-sm text-slate-600">Nenhum material ainda. {manage ? "Crie o primeiro acima." : ""}</p> : (
        MATERIAL_CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
          <section key={c} className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-brand-900">{EMOJI[c]} {c}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.filter((i) => i.category === c).map((i) => (
                <article key={i.id} className="card p-4">
                  <h3 className="font-medium text-brand-900">{i.title}</h3>
                  {i.body && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm text-slate-600">{i.body}</pre>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {i.body && <CopyButton text={i.body} label="Copiar texto" />}
                    {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Abrir link ↗</a>}
                    {manage && <form action={deleteMaterialAction.bind(null, i.id)} className="ml-auto"><button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover</button></form>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
