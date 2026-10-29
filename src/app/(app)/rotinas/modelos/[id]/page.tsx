import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/layout";
import { TemplateForm } from "@/components/routine-forms";
import { ConfirmAction } from "@/components/confirm-action";
import { archiveTemplateAction, updateTemplateAction } from "@/app/actions/routines";
import { can } from "@/domain/permissions";
import { describeRule } from "@/domain/recurrence";
import { CATEGORY_LABEL } from "@/domain/enums";
import { requirePermission } from "@/server/context";
import { getTemplate } from "@/server/services/templates";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Modelo de rotina" };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("recurrences.manage");
  const { id } = await params;
  const t = await orNotFound(getTemplate(actor, id));
  const editable = can(actor, "templates.manage");
  return (
    <>
      <PageHeader
        title={t.name}
        description={t.archivedAt ? "Modelo arquivado: não gera novas tarefas." : "Alterações valem para as próximas ocorrências; tarefas já geradas não mudam."}
        breadcrumb={{ href: "/rotinas?aba=modelos", label: "Modelos" }}
        actions={
          editable &&
          (t.archivedAt ? (
            <ConfirmAction action={archiveTemplateAction.bind(null, id, false)} label="Reativar modelo" confirm="Reativar este modelo? As recorrências continuarão pausadas até serem reativadas." />
          ) : (
            <ConfirmAction
              action={archiveTemplateAction.bind(null, id, true)}
              label="Arquivar modelo"
              className="btn-ghost text-red-700"
              confirm="Arquivar o modelo? Todas as recorrências vinculadas serão pausadas. As tarefas já geradas são preservadas."
            />
          ))
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {editable ? (
            <TemplateForm
              action={updateTemplateAction.bind(null, id)}
              submitLabel="Salvar modelo"
              values={{ ...t, checklist: t.checklistItems.map((c) => ({ label: c.label, required: c.required })) }}
            />
          ) : (
            <Card title="Resumo">
              <p className="text-sm">{t.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {CATEGORY_LABEL[t.category]} · {describeRule(t)}
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm">
                {t.checklistItems.map((c) => (
                  <li key={c.id}>
                    {c.label}
                    {c.required && " (obrigatório)"}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card title="Clientes que usam este modelo">
          {t.recurrences.length ? (
            <ul className="space-y-1 text-sm">
              {t.recurrences.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <Link className="hover:underline" href={`/rotinas/recorrencias/${r.id}`}>
                    {r.client.tradeName}
                  </Link>
                  <span className={`text-xs ${r.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"}`}>
                    {r.status === "ACTIVE" ? "Ativa" : "Pausada"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Ainda não vinculado a clientes.</p>
          )}
          <Link href={`/rotinas/recorrencias/nova?templateId=${id}`} className="btn-secondary mt-4 w-full">
            Vincular a um cliente
          </Link>
        </Card>
      </div>
    </>
  );
}
