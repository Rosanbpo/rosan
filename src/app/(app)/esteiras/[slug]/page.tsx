import Link from "next/link";
import { notFound } from "next/navigation";
import { applyEsteiraAction } from "@/app/actions/esteiras";
import { EsteiraApplyForm } from "@/components/esteira-apply-form";
import { EsteiraIcon } from "@/components/esteira-icon";
import { instantToLocalDate } from "@/domain/dates";
import { esteiraCounts } from "@/domain/esteiras";
import { can } from "@/domain/permissions";
import { cx, TONE } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { esteiraProgress, getEsteiraFor } from "@/server/services/esteiras";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Esteira" };

export default async function EsteiraPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const actor = await requirePermission("projects.manage");
  const esteira = await getEsteiraFor(actor.organizationId, slug);
  if (!esteira) notFound();
  const [clients, people, progress] = await Promise.all([clientOptions(actor), assignableUsers(actor), esteiraProgress(actor)]);
  const tone = TONE[esteira.tone];
  const c = esteiraCounts(esteira);
  const using = progress[esteira.slug]?.clients ?? [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/esteiras" className="btn-secondary btn-sm">
          ← Voltar
        </Link>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", tone.soft, tone.text)}>
          <EsteiraIcon icon={esteira.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-slate-900">{esteira.name}</h1>
          <p className="text-xs text-slate-500">
            {esteira.summary} · {c.stages} etapas · {c.tasks} tarefas · {c.items} itens de checklist
          </p>
        </div>
        {can(actor, "templates.manage") && (
          <Link href={`/esteiras/${esteira.slug}/editar`} className="btn-secondary btn-sm">
            ✏️ Editar esteira
          </Link>
        )}
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
