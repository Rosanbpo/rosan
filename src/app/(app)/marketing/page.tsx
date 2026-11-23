import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { MarketingTabs } from "@/components/marketing-tabs";
import { MarketingHero } from "@/components/marketing-hero";
import { createIdeaAction, importLibraryAction } from "@/app/actions/marketing";
import { parseSlides, PILLARS, PILLAR_LABEL, POST_STATUSES, POST_STATUS_LABEL, type Pillar } from "@/domain/marketing";
import { cx } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { listIdeas } from "@/server/services/marketing";

export const metadata = { title: "Marketing" };

const PILLAR_TONE: Record<Pillar, string> = {
  EDUCATIVO: "bg-sky-50 text-sky-800",
  MITOS: "bg-amber-50 text-amber-800",
  BASTIDORES: "bg-violet-50 text-violet-800",
  AUTORIDADE: "bg-emerald-50 text-emerald-800",
};

export default async function MarketingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const pillar = typeof sp.pilar === "string" && (PILLARS as readonly string[]).includes(sp.pilar) ? (sp.pilar as Pillar) : null;
  const all = await listIdeas(actor);
  const ideas = pillar ? all.filter((i) => i.pillar === pillar) : all;

  return (
    <>
      <MarketingHero actor={actor} />

      <MarketingTabs active="conteudos" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">Guarde ideias, produza carrosséis com a sua identidade e baixe os slides prontos para postar.</p>
        <ActionForm action={importLibraryAction} inlineFeedback>
          <SubmitButton className="btn-secondary" pendingText="Importando…">
            <Sparkles aria-hidden className="h-4 w-4" /> Importar posts prontos
          </SubmitButton>
        </ActionForm>
      </div>

      <ActionForm action={createIdeaAction} className="card mb-5 p-4" resetOnSuccess>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field label="Nova ideia de conteúdo" name="title">
              <input name="title" className="input" required minLength={3} maxLength={160} placeholder="Ex.: Como organizar as contas a pagar da semana" />
            </Field>
          </div>
          <div className="w-48">
            <Field label="Linha de conteúdo" name="pillar">
              <select name="pillar" className="input" defaultValue="EDUCATIVO">
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="min-w-[200px] flex-1">
            <Field label="Anotação (opcional)" name="notes">
              <input name="notes" className="input" maxLength={2000} placeholder="Ângulo, referência, o que não esquecer" />
            </Field>
          </div>
          <SubmitButton pendingText="Criando…">Adicionar ideia</SubmitButton>
        </div>
      </ActionForm>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por linha de conteúdo">
        {[null, ...PILLARS].map((p) => (
          <Link
            key={p ?? "todas"}
            href={p ? `/marketing?pilar=${p}` : "/marketing"}
            aria-current={pillar === p ? "true" : undefined}
            className={cx("rounded-full border px-3.5 py-1.5 text-[13px] font-medium", pillar === p ? "border-brand-900 bg-brand-900 text-white" : "border-[#d3dae5] bg-white text-slate-700 hover:border-brand-700")}
          >
            {p ? PILLAR_LABEL[p] : "Todas"}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">
          Nenhum conteúdo ainda. Adicione uma ideia acima ou use <strong>Importar posts prontos</strong> para começar com 8 carrosséis e 10 ideias.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {POST_STATUSES.map((st) => {
            const col = ideas.filter((i) => i.status === st);
            return (
              <section key={st} aria-label={POST_STATUS_LABEL[st]} className="rounded-2xl bg-white/70 p-3 ring-1 ring-[#d3dae5]">
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-brand-900">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={cx("h-2.5 w-2.5 rounded-full", { IDEIA: "bg-slate-400", PRODUCAO: "bg-amber-400", PRONTO: "bg-emerald-500", PUBLICADO: "bg-brand-900" }[st])} />
                    {POST_STATUS_LABEL[st]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">{col.length}</span>
                </h2>
                <ul className="space-y-2.5">
                  {col.map((i) => {
                    const n = parseSlides(i.slidesText).length;
                    return (
                      <li key={i.id}>
                        <Link href={`/marketing/${i.id}`} className="card block overflow-hidden transition-colors hover:border-brand-700">
                          {n > 0 && (st === "PRONTO" || st === "PUBLICADO") && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/marketing/${i.id}/slide/1?v=${i.updatedAt.getTime()}`} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                          )}
                          <div className="p-3">
                            <p className="text-sm font-medium text-slate-900">{i.title}</p>
                            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className={cx("rounded-full px-2 py-0.5 font-medium", PILLAR_TONE[i.pillar as Pillar])}>{PILLAR_LABEL[i.pillar as Pillar]}</span>
                              {n > 0 && <span className="text-slate-500">{n} slides</span>}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
