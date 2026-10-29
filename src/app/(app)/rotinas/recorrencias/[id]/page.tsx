import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/layout";
import { RecurrenceForm } from "@/components/routine-forms";
import { ConfirmAction } from "@/components/confirm-action";
import { StatusBadge } from "@/components/ui/badges";
import { setRecurrenceStatusAction, updateRecurrenceAction } from "@/app/actions/routines";
import { dbDateToLocalDate } from "@/domain/dates";
import { describeRule } from "@/domain/recurrence";
import type { TaskStatus } from "@/domain/enums";
import { fmtDateTime, fmtLocalDate } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { getRecurrence } from "@/server/services/recurrences";
import { peopleWithClients } from "@/server/services/tasks";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Recorrência" };

export default async function RecurrencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("recurrences.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [r, people] = await Promise.all([orNotFound(getRecurrence(actor, id)), peopleWithClients(actor)]);
  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/rotinas", label: "Recorrências" }}
        title={`${r.template.name} — ${r.client.tradeName}`}
        description={describeRule(r)}
        actions={
          r.status === "ACTIVE" ? (
            <ConfirmAction
              action={setRecurrenceStatusAction.bind(null, id, "PAUSED")}
              label="Pausar"
              confirm="Pausar esta recorrência? Novas tarefas deixam de ser geradas; as existentes são mantidas."
            />
          ) : (
            <ConfirmAction
              action={setRecurrenceStatusAction.bind(null, id, "ACTIVE")}
              label="Reativar"
              className="btn-primary"
              confirm="Reativar a recorrência? O período em que ficou pausada não será gerado retroativamente."
            />
          )
        }
      />
      {sp.criada && (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Recorrência criada. Ocorrências dentro da antecedência já foram geradas.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecurrenceForm
            action={updateRecurrenceAction.bind(null, id)}
            mode="edit"
            clients={[{ id: r.client.id, tradeName: r.client.tradeName }]}
            templates={[{ id: r.templateId, name: r.template.name, rule: r }]}
            people={people}
            values={{
              ...r,
              startDate: dbDateToLocalDate(r.startDate),
              endDate: r.endDate ? dbDateToLocalDate(r.endDate) : null,
            }}
          />
        </div>
        <div className="space-y-6">
          <Card title="Geração">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Situação</dt>
              <dd className={r.blocker ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>{r.blocker ?? "Ativa"}</dd>
              <dt className="text-slate-500">Próximo prazo</dt>
              <dd>{r.next ? fmtLocalDate(r.next.dueDate) : "—"}</dd>
              <dt className="text-slate-500">Será gerada em</dt>
              <dd>{r.next ? fmtLocalDate(r.next.generateOn) : "—"}</dd>
              <dt className="text-slate-500">Última geração</dt>
              <dd>{fmtDateTime(r.lastGeneratedAt)}</dd>
              <dt className="text-slate-500">Gera a partir de</dt>
              <dd>{fmtLocalDate(dbDateToLocalDate(r.generationFloor))}</dd>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              Alterações na regra valem a partir de hoje. Tarefas já geradas mantêm título, checklist e prazo originais.
            </p>
          </Card>
          <Card title="Tarefas geradas" description="Últimas 12">
            {r.tasks.length ? (
              <ul className="space-y-2 text-sm">
                {r.tasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2">
                    <Link href={`/tarefas/${t.id}`} className="hover:underline">
                      {fmtDateTime(t.dueAt)}
                    </Link>
                    <StatusBadge status={t.status as TaskStatus} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma tarefa gerada ainda.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
