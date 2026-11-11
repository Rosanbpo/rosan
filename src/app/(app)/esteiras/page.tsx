import Link from "next/link";
import { ArrowRight, Layers, ListChecks, Users } from "lucide-react";
import { EsteiraIcon } from "@/components/esteira-icon";
import { PageHeader } from "@/components/ui/layout";
import { ESTEIRAS, esteiraCounts } from "@/domain/esteiras";
import { cx, TONE } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { esteiraProgress } from "@/server/services/esteiras";

export const metadata = { title: "Esteiras" };

export default async function EsteirasPage() {
  const actor = await requirePermission("projects.manage");
  const progress = await esteiraProgress(actor);
  return (
    <>
      <PageHeader
        title="Esteiras"
        description="Jornadas prontas do cliente, da venda ao encerramento. Escolha uma esteira, marque as tarefas e aplique ao cliente: as tarefas nascem com prazo, responsável e checklist."
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {ESTEIRAS.map((e) => {
          const tone = TONE[e.tone];
          const c = esteiraCounts(e);
          const used = progress[e.slug]?.clients.length ?? 0;
          return (
            <Link
              key={e.slug}
              href={`/esteiras/${e.slug}`}
              className={cx("group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", tone.border)}
            >
              <div className={cx("flex items-center gap-3 bg-gradient-to-r px-5 py-4 text-white", tone.band)}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                  <EsteiraIcon icon={e.icon} className="h-6 w-6" />
                </span>
                <h2 className="text-lg font-semibold">{e.name}</h2>
              </div>
              <div className="space-y-4 p-5">
                <p className="min-h-10 text-sm text-slate-600">{e.summary}</p>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: Layers, label: "etapas", n: c.stages },
                    { icon: ListChecks, label: "tarefas", n: c.tasks },
                    { icon: ListChecks, label: "itens", n: c.items },
                  ].map((x) => (
                    <div key={x.label} className={cx("rounded-lg py-2", tone.soft)}>
                      <dd className={cx("text-xl font-bold tabular-nums", tone.text)}>{x.n}</dd>
                      <dt className="text-[11px] tracking-wide text-slate-500 uppercase">{x.label}</dt>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Users aria-hidden className="h-4 w-4" />
                    {used === 0 ? "Nenhum cliente ainda" : `${used} cliente${used > 1 ? "s" : ""}`}
                  </span>
                  <span className={cx("flex items-center gap-1 font-medium", tone.text)}>
                    Ver e aplicar <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
