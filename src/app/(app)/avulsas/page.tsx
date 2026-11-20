import Link from "next/link";
import { quickAvulsaAction } from "@/app/actions/tasks";
import { TaskTable } from "@/components/task-table";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { instantToLocalDate } from "@/domain/dates";
import { PRIORITIES } from "@/domain/enums";
import { cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { pageOf, str } from "@/server/page-utils";
import { assignableUsers, listTasks } from "@/server/services/tasks";
import { getRunningTimer } from "@/server/services/timer";

export const metadata = { title: "Avulsas" };

const PRIORITY_LABEL: Record<string, string> = { BAIXA: "Baixa", NORMAL: "Normal", ALTA: "Alta", URGENTE: "Urgente" };

export default async function AvulsasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const concluidas = str(sp, "v") === "concluidas";
  const [result, people, running] = await Promise.all([
    listTasks(actor, { clientId: "interna", open: !concluidas, status: concluidas ? ["CONCLUIDA"] : undefined, sort: concluidas ? "completed" : "due", page: pageOf(sp) }),
    assignableUsers(actor),
    getRunningTimer(actor),
  ]);
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  return (
    <>
      <PageHeader title="Avulsas" description="Tarefas internas da empresa, sem cliente: marketing, comercial, administrativo, estudos." />
      <ActionForm action={quickAvulsaAction} className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_9rem_7rem_10rem_auto]" resetOnSuccess>
        <div>
          <label htmlFor="title" className="label">
            Nova tarefa avulsa
          </label>
          <input id="title" name="title" required className="input" placeholder="Ex.: Publicar conteúdo no Instagram" />
        </div>
        <div>
          <label htmlFor="dueDate" className="label">
            Prazo
          </label>
          <input id="dueDate" name="dueDate" type="date" required className="input" defaultValue={today} />
        </div>
        <div>
          <label htmlFor="priority" className="label">
            Prioridade
          </label>
          <select id="priority" name="priority" className="input" defaultValue="NORMAL">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assigneeId" className="label">
            Responsável
          </label>
          <select id="assigneeId" name="assigneeId" className="input" defaultValue={actor.userId}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <SubmitButton>Adicionar</SubmitButton>
        </div>
      </ActionForm>
      <div className="mb-4 flex gap-1" role="tablist" aria-label="Situação">
        {[
          { v: "", label: "Abertas" },
          { v: "concluidas", label: "Concluídas" },
        ].map((t) => (
          <Link
            key={t.label}
            role="tab"
            aria-selected={(t.v === "concluidas") === concluidas}
            href={t.v ? `/avulsas?v=${t.v}` : "/avulsas"}
            className={cx("rounded-lg px-3 py-1.5 text-sm font-medium", (t.v === "concluidas") === concluidas ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}
          >
            {t.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-xs text-slate-500">{result.total} tarefa(s)</span>
      </div>
      {result.rows.length === 0 ? (
        <EmptyState title={concluidas ? "Nenhuma avulsa concluída" : "Nenhuma tarefa avulsa aberta"} description="Use o campo acima para criar a primeira." />
      ) : (
        <div className="card">
          <TaskTable rows={result.rows} showClient={false} caption="Tarefas avulsas" actor={actor} running={running} />
          <div className="border-t border-slate-100 px-3">
            <Pagination total={result.total} page={result.page} pageSize={result.pageSize} searchParams={sp} basePath="/avulsas" />
          </div>
        </div>
      )}
    </>
  );
}
