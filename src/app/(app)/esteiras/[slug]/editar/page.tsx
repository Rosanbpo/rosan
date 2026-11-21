import Link from "next/link";
import { notFound } from "next/navigation";
import { resetEsteiraAction, saveEsteiraAction } from "@/app/actions/esteiras";
import { PageHeader } from "@/components/ui/layout";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CATEGORY_LABEL } from "@/domain/enums";
import { stagesToText } from "@/domain/esteiras";
import { requirePermission } from "@/server/context";
import { getEsteiraFor } from "@/server/services/esteiras";

export const metadata = { title: "Editar fase da jornada" };

export default async function EditEsteiraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await requirePermission("templates.manage");
  const e = await getEsteiraFor(actor.organizationId, slug);
  if (!e) notFound();
  return (
    <>
      <PageHeader title={`Editar fase da jornada: ${e.name}`} description="Mude etapas, tarefas, prazos e checklists. Ao salvar, vale em todo o sistema (jornada do cliente e do lead, CRM, tarefas). Tarefas que já foram criadas para um cliente não mudam." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <ActionForm action={saveEsteiraAction.bind(null, slug)} className="card space-y-3 p-5">
          <textarea name="text" defaultValue={stagesToText(e.stages)} rows={28} spellCheck={false} className="input w-full font-mono text-[13px] leading-relaxed" />
          <div className="flex items-center gap-3">
            <SubmitButton>Salvar fase</SubmitButton>
            <Link href={`/biblioteca?secao=jornada#${slug}`} className="btn-secondary">Cancelar</Link>
          </div>
        </ActionForm>
        <aside className="space-y-4 text-sm text-slate-600">
          <div className="card p-4">
            <h2 className="mb-2 font-semibold text-brand-900">Como escrever</h2>
            <p><code>## Nome da etapa</code></p>
            <p className="mt-1"><code>### Título | Categoria | dia | minutos | Prioridade</code></p>
            <p className="mt-1"><code>&gt; descrição (opcional)</code></p>
            <p className="mt-1"><code>- item do checklist</code></p>
            <p className="mt-3">O dia conta a partir da data de início ao aplicar. A prioridade é opcional (Baixa, Normal, Alta, Crítica).</p>
            <p className="mt-2">Ao salvar, o que foi mudado aparece em todo o sistema (jornada do cliente e do lead, tarefas, textos padrão). Renomeou uma tarefa? Os textos padrão e as tarefas já geradas continuam ligados. Faça uma mudança de cada vez: renomear <b>ou</b> reordenar, para o sistema reconhecer a tarefa.</p>
            <p className="mt-3 text-xs text-slate-500">Categorias: {Object.values(CATEGORY_LABEL).join(", ")}.</p>
          </div>
          {e.custom && (
            <form action={resetEsteiraAction.bind(null, slug)} className="card p-4">
              <p className="mb-2">Esta esteira está personalizada.</p>
              <button className="btn-secondary" type="submit">Voltar ao padrão</button>
            </form>
          )}
          <p className="text-xs text-slate-500">Dica: mudar a ordem de tarefas já aplicadas pode fazer o sistema tratá-las como novas ao reaplicar a esteira ao mesmo cliente.</p>
        </aside>
      </div>
    </>
  );
}
