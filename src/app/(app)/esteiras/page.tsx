import Link from "next/link";
import { Users } from "lucide-react";
import { EsteiraIcon } from "@/components/esteira-icon";
import { PageHeader } from "@/components/ui/layout";
import { esteiraCounts } from "@/domain/esteiras";
import { cx, TONE } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { esteiraProgress, listEsteirasFor } from "@/server/services/esteiras";

export const metadata = { title: "Esteiras" };

export default async function EsteirasPage() {
  const actor = await requirePermission("projects.manage");
  const [progress, ESTEIRAS] = await Promise.all([esteiraProgress(actor), listEsteirasFor(actor.organizationId)]);
  return (
    <>
      <PageHeader
        title="Esteiras"
        description="Selecione uma esteira para ver as tarefas e checklists. Use “Aplicar selecionadas ao cliente” para criar as tarefas automaticamente."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ESTEIRAS.map((e) => {
          const tone = TONE[e.tone];
          const c = esteiraCounts(e);
          const used = progress[e.slug]?.clients.length ?? 0;
          return (
            <Link
              key={e.slug}
              href={`/esteiras/${e.slug}`}
              className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1.5", tone.solid)} />
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", tone.soft, tone.text)}>
                <EsteiraIcon icon={e.icon} className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-slate-900">{e.name}</h2>
              <p className="text-xs text-slate-500">{c.stages} etapas</p>
              <p className="mt-2 text-xs text-slate-500">
                ✓ {c.tasks} tarefas · 📋 {c.items} itens
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", tone.chip)}>Clique para ver e aplicar</span>
                {used > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Users aria-hidden className="h-3.5 w-3.5" /> {used}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
