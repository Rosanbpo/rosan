import { notFound } from "next/navigation";
import { CopyCaption, DeleteIdea, DownloadAll } from "@/components/marketing-tools";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { PageHeader } from "@/components/ui/layout";
import { updateIdeaAction } from "@/app/actions/marketing";
import { parseSlides, PILLARS, PILLAR_LABEL, POST_STATUSES, POST_STATUS_LABEL } from "@/domain/marketing";
import { NotFoundError } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { getIdea } from "@/server/services/marketing";

export const metadata = { title: "Conteúdo · Marketing" };

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const idea = await getIdea(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const slides = parseSlides(idea.slidesText);
  const v = idea.updatedAt.getTime();
  const copy = [idea.caption, idea.hashtags].filter(Boolean).join("\n\n");

  return (
    <>
      <PageHeader
        title={idea.title}
        breadcrumb={{ href: "/marketing", label: "Marketing" }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CopyCaption text={copy} />
            <DownloadAll id={id} count={slides.length} />
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ActionForm action={updateIdeaAction.bind(null, id)} className="card space-y-4 p-5">
          <Field label="Título" name="title">
            <input name="title" className="input" required minLength={3} maxLength={160} defaultValue={idea.title} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Linha de conteúdo" name="pillar">
              <select name="pillar" className="input" defaultValue={idea.pillar}>
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etapa" name="status">
              <select name="status" className="input" defaultValue={idea.status}>
                {POST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {POST_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data de publicação" name="publishOn">
              <input name="publishOn" type="date" className="input" defaultValue={idea.publishOn?.toISOString().slice(0, 10) ?? ""} />
            </Field>
          </div>
          <Field label="Slides" name="slidesText" hint="Separe os slides com uma linha “---”. A primeira linha de cada slide é o título; o resto é o texto. O primeiro é a capa e o último é o encerramento.">
            <textarea name="slidesText" className="input font-mono text-[13px]" rows={16} defaultValue={idea.slidesText} placeholder={"Título da capa\nSubtítulo\n---\n1. Primeiro ponto\nExplicação curta\n---\nSalve este post\nChamada final"} />
          </Field>
          <Field label="Legenda" name="caption">
            <textarea name="caption" className="input" rows={6} defaultValue={idea.caption} />
          </Field>
          <Field label="Hashtags" name="hashtags">
            <textarea name="hashtags" className="input" rows={2} defaultValue={idea.hashtags} />
          </Field>
          <Field label="Anotações" name="notes">
            <textarea name="notes" className="input" rows={3} defaultValue={idea.notes} />
          </Field>
          <div className="flex items-center justify-between">
            <SubmitButton>Salvar conteúdo</SubmitButton>
            <DeleteIdea id={id} />
          </div>
        </ActionForm>

        <section aria-label="Prévia dos slides">
          <h2 className="mb-2 text-sm font-semibold text-brand-900">Prévia ({slides.length} slides)</h2>
          {slides.length === 0 ? (
            <div className="card p-6 text-sm text-slate-600">Escreva o texto dos slides ao lado e salve: a prévia aparece aqui, já com a identidade da Rosan.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {slides.map((_, i) => (
                <li key={i} className="card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/marketing/${id}/slide/${i + 1}?v=${v}`} alt={`Slide ${i + 1}`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  <a href={`/marketing/${id}/slide/${i + 1}?baixar=1`} className="block border-t border-slate-100 px-3 py-1.5 text-center text-xs font-medium text-brand-700 hover:bg-slate-50">
                    Baixar slide {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
