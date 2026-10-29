import Link from "next/link";
import { Plus } from "lucide-react";
import { CATEGORY_LABEL } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { describeRule } from "@/domain/recurrence";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtDateTime, fmtLocalDate } from "@/lib/format";
import { cx } from "@/lib/ui";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/context";
import { listRecurrences } from "@/server/services/recurrences";
import { listTemplates } from "@/server/services/templates";
import { str } from "@/server/page-utils";

export const metadata = { title: "Modelos e recorrências" };

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("recurrences.manage");
  const sp = await searchParams;
  const tab = str(sp, "aba") === "modelos" ? "modelos" : "recorrencias";
  const canTemplates = can(actor, "templates.manage");
  const lastRun = await prisma.schedulerRun.findFirst({ where: { finishedAt: { not: null }, OR: [{ organizationId: null }, { organizationId: actor.organizationId }] }, orderBy: { startedAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Modelos e recorrências"
        description="Modelos padronizam rotinas; recorrências vinculam um modelo a um cliente e geram as tarefas automaticamente."
        actions={
          <>
            <Link href="/rotinas/recorrencias/nova" className="btn-primary">
              <Plus aria-hidden className="h-4 w-4" /> Nova recorrência
            </Link>
            {canTemplates && (
              <Link href="/rotinas/modelos/novo" className="btn-secondary">
                <Plus aria-hidden className="h-4 w-4" /> Novo modelo
              </Link>
            )}
          </>
        }
      />
      <p className="mb-4 text-xs text-slate-500">
        Última execução do gerador: {lastRun ? `${fmtDateTime(lastRun.finishedAt)} (${lastRun.created} criada(s), ${lastRun.trigger})` : "nenhuma registrada — configure o agendador (veja o README)."}
      </p>
      <nav aria-label="Seções" className="mb-4 flex gap-1 border-b border-slate-200">
        {[
          { key: "recorrencias", label: "Recorrências por cliente" },
          { key: "modelos", label: "Modelos de rotina" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/rotinas?aba=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "recorrencias" ? <RecurrencesTab /> : <TemplatesTab canEdit={canTemplates} />}
    </>
  );
}

async function RecurrencesTab() {
  const actor = await requirePermission("recurrences.manage");
  const rows = await listRecurrences(actor);
  if (!rows.length)
    return (
      <EmptyState
        title="Nenhuma recorrência configurada"
        description="Vincule um modelo de rotina a um cliente para gerar tarefas automaticamente."
        action={<Link href="/rotinas/recorrencias/nova" className="btn-primary">Nova recorrência</Link>}
      />
    );
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <caption className="sr-only">Recorrências</caption>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Rotina</th>
            <th scope="col">Regra</th>
            <th scope="col">Responsável</th>
            <th scope="col">Próxima ocorrência</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/clientes/${r.client.id}`} className="hover:underline">
                  {r.client.tradeName}
                </Link>
              </td>
              <td>
                <Link href={`/rotinas/recorrencias/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                  {r.template.name}
                </Link>
              </td>
              <td className="max-w-xs text-xs text-slate-600">{describeRule(r)}</td>
              <td>{r.assignee?.name ?? <span className="text-slate-500">Resp. do cliente</span>}</td>
              <td className="whitespace-nowrap">
                {r.next ? (
                  <>
                    Prazo {fmtLocalDate(r.next.dueDate)}
                    <span className="block text-xs text-slate-500">gera em {fmtLocalDate(r.next.generateOn)}</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td>
                {r.blocker ? (
                  <span className="text-xs font-medium text-amber-700">{r.blocker}</span>
                ) : (
                  <span className="text-xs font-medium text-emerald-700">Ativa</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function TemplatesTab({ canEdit }: { canEdit: boolean }) {
  const actor = await requirePermission("recurrences.manage");
  const [active, archived] = await Promise.all([listTemplates(actor), listTemplates(actor, { archived: true })]);
  if (!active.length && !archived.length)
    return <EmptyState title="Nenhum modelo" description="Crie modelos para padronizar rotinas como conciliação e fechamento." />;
  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <table className="table">
          <caption className="sr-only">Modelos de rotina</caption>
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">Categoria</th>
              <th scope="col">Regra padrão</th>
              <th scope="col" className="text-right">Itens</th>
              <th scope="col" className="text-right">Recorrências ativas</th>
            </tr>
          </thead>
          <tbody>
            {active.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/rotinas/modelos/${t.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                    {t.name}
                  </Link>
                  {t.requiresEvidence && <span className="ml-2 text-xs text-slate-500">exige evidência</span>}
                </td>
                <td>{CATEGORY_LABEL[t.category]}</td>
                <td className="text-xs text-slate-600">{describeRule(t)}</td>
                <td className="text-right tabular-nums">{t._count.checklistItems}</td>
                <td className="text-right tabular-nums">{t._count.recurrences}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium">Modelos arquivados ({archived.length})</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {archived.map((t) => (
              <li key={t.id}>
                <Link className="hover:underline" href={`/rotinas/modelos/${t.id}`}>
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!canEdit && <p className="text-xs text-slate-500">Apenas administradores editam modelos. Gestores podem vinculá-los aos clientes.</p>}
    </div>
  );
}
