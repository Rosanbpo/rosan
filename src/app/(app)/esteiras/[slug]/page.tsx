import Link from "next/link";
import { notFound } from "next/navigation";
import { applyEsteiraAction } from "@/app/actions/esteiras";
import { EsteiraApplyForm } from "@/components/esteira-apply-form";
import { EsteiraIcon } from "@/components/esteira-icon";
import { instantToLocalDate } from "@/domain/dates";
import { esteiraCounts, getEsteira } from "@/domain/esteiras";
import { cx, TONE } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { esteiraProgress } from "@/server/services/esteiras";
import { assignableUsers } from "@/server/services/tasks";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = getEsteira((await params).slug);
  return { title: e ? `Esteira ${e.name}` : "Esteira" };
}

export default async function EsteiraPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const esteira = getEsteira(slug);
  if (!esteira) notFound();
  const actor = await requirePermission("projects.manage");
  const [clients, people, progress] = await Promise.all([clientOptions(actor), assignableUsers(actor), esteiraProgress(actor)]);
  const tone = TONE[esteira.tone];
  const c = esteiraCounts(esteira);
  const using = progress[esteira.slug]?.clients ?? [];

  return (
    <>
      <div className={cx("mb-6 overflow-hidden rounded-2xl bg-gradient-to-r text-white shadow-sm", tone.band)}>
        <div className="px-6 py-5">
          <Link href="/esteiras" className="text-sm text-white/80 hover:text-white hover:underline">
            ← Esteiras
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <EsteiraIcon icon={esteira.icon} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">{esteira.name}</h1>
              <p className="text-sm text-white/85">
                {esteira.summary} · {c.stages} etapas · {c.tasks} tarefas · {c.items} itens de checklist
              </p>
            </div>
          </div>
        </div>
      </div>

      {using.length > 0 && (
        <section className={cx("mb-6 rounded-xl border bg-white p-4 shadow-sm", tone.border)}>
          <h2 className="mb-2 text-sm font-semibold text-brand-900">Clientes com esta esteira</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {using.map((u) => {
              const pct = u.total ? Math.round((u.done / u.total) * 100) : 0;
              return (
                <li key={u.id}>
                  <Link href={`/clientes/${u.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 hover:border-brand-500">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{u.name}</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {u.done}/{u.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={cx("h-full rounded-full", tone.solid)} style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <EsteiraApplyForm
        esteira={esteira}
        action={applyEsteiraAction}
        clients={clients}
        people={people}
        clientId={sp.cliente}
        today={instantToLocalDate(new Date(), APP_TIMEZONE)}
      />
    </>
  );
}
