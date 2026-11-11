import Link from "next/link";
import { Plus } from "lucide-react";
import { CATEGORY_LABEL, JOURNEY_STAGES, STAGE_LABEL, TASK_CATEGORIES, type JourneyStage, type TaskCategory } from "@/domain/enums";
import { importTemplateLibraryAction } from "@/app/actions/routines";
import { ConfirmAction } from "@/components/confirm-action";
import { TEMPLATE_LIBRARY } from "@/domain/template-library";
import { can } from "@/domain/permissions";
import { describeRule } from "@/domain/recurrence";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtDateTime, fmtLocalDate } from "@/lib/format";
import { cx, STAGE_TONE, TONE } from "@/lib/ui";
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
      {tab === "recorrencias" ? <RecurrencesTab /> : <TemplatesTab canEdit={canTemplates} etapa={str(sp, "etapa")} area={str(sp, "area")} />}
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

async function TemplatesTab({ canEdit, etapa, area }: { canEdit: boolean; etapa?: string; area?: string }) {
  const actor = await requirePermission("recurrences.manage");
  const [all, archived] = await Promise.all([listTemplates(actor), listTemplates(actor, { archived: true })]);
  const stage = JOURNEY_STAGES.includes(etapa as JourneyStage) ? (etapa as JourneyStage) : undefined;
  const category = TASK_CATEGORIES.includes(area as TaskCategory) ? (area as TaskCategory) : undefined;
  const active = all.filter((t) => (!stage || t.stage === stage) && (!category || t.category === category));
  const href = (e?: string, a?: string) => {
    const q = new URLSearchParams({ aba: "modelos" });
    if (e) q.set("etapa", e);
    if (a) q.set("area", a);
    return `/rotinas?${q.toString()}`;
  };
  const countBy = (st: JourneyStage) => all.filter((t) => t.stage === st).length;

  if (!all.length && !archived.length)
    return (
      <EmptyState
        title="Nenhum modelo ainda"
        description={`Comece com a biblioteca pronta (${TEMPLATE_LIBRARY.length} modelos de rotina de BPO financeiro) ou crie o seu.`}
        action={canEdit ? <ConfirmAction action={importTemplateLibraryAction} label="Importar biblioteca de modelos" confirm={`Importar ${TEMPLATE_LIBRARY.length} modelos prontos?`} className="btn-primary" /> : undefined}
      />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <span>Modelos padronizam rotinas. Vincule um modelo a um cliente em <strong>Recorrências</strong> para gerar as tarefas sozinho.</span>
        {canEdit && <ConfirmAction action={importTemplateLibraryAction} label="Importar biblioteca" confirm={`Importar os modelos prontos que ainda não existem (${TEMPLATE_LIBRARY.length} no total)?`} />}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por etapa">
        <Link href={href(undefined, area)} className={cx("rounded-full border px-3 py-1 text-sm font-medium", !stage ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-500")}>
          Todas ({all.length})
        </Link>
        {JOURNEY_STAGES.map((st) => {
          const tone = TONE[STAGE_TONE[st]];
          const on = stage === st;
          return (
            <Link key={st} href={href(st, area)} className={cx("rounded-full border px-3 py-1 text-sm font-medium", on ? cx(tone.solid, "border-transparent text-white") : cx(tone.soft, tone.border, tone.text, "hover:brightness-95"))}>
              {STAGE_LABEL[st]} ({countBy(st)})
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Filtrar por área">
        <span className="text-slate-500">Área:</span>
        <Link href={href(etapa, undefined)} className={cx("rounded-md px-2 py-0.5", !category ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100")}>
          Todas
        </Link>
        {TASK_CATEGORIES.filter((c) => all.some((t) => t.category === c)).map((c) => (
          <Link key={c} href={href(etapa, c)} className={cx("rounded-md px-2 py-0.5", category === c ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState title="Nenhum modelo com esses filtros" description="Tire um filtro para ver mais modelos." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((t) => {
            const tone = TONE[t.stage ? STAGE_TONE[t.stage] : "slate"];
            const dot = t.priority === "CRITICA" ? "bg-red-500" : t.priority === "ALTA" ? "bg-orange-500" : t.priority === "NORMAL" ? "bg-sky-500" : "bg-slate-300";
            return (
              <Link key={t.id} href={`/rotinas/modelos/${t.id}`} className={cx("group relative flex flex-col overflow-hidden rounded-xl border bg-white p-4 pl-5 shadow-sm transition hover:shadow-md", tone.border)}>
                <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1.5", tone.solid)} />
                <div className={cx("flex items-start gap-2", tone.text)}>
                  <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
                  <h3 className="flex-1 text-sm font-semibold text-slate-900 group-hover:text-brand-700">{t.name}</h3>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  {t.stage && <span className={cx("rounded-full px-2 py-0.5", tone.chip)}>{STAGE_LABEL[t.stage]}</span>}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{CATEGORY_LABEL[t.category]}</span>
                  {t.requiresEvidence && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">exige evidência</span>}
                </div>
                <p className="mt-2 text-xs text-slate-600">{describeRule(t)}</p>
                <p className="mt-auto pt-3 text-xs text-slate-500">
                  {t._count.checklistItems} itens · {t._count.recurrences} recorrência(s) ativa(s)
                </p>
              </Link>
            );
          })}
        </div>
      )}

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
