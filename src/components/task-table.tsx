import Link from "next/link";
import { CATEGORY_LABEL, type Priority, type TaskCategory, type TaskStatus } from "@/domain/enums";
import { isOverdue } from "@/domain/task-rules";
import { fmtCompetence } from "@/lib/format";
import { cx } from "@/lib/ui";
import { DueDate, OverdueBadge, PriorityBadge, StatusBadge } from "./ui/badges";
import type { TaskListRow } from "@/server/services/tasks";
import { Repeat } from "lucide-react";
import type { Actor } from "@/domain/permissions";
import { taskRights } from "@/domain/task-rules";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { TaskRowTools } from "./task-row-tools";

export function TaskTable({
  rows,
  showClient = true,
  showAssignee = true,
  compact = false,
  caption,
  actor,
  running,
}: {
  rows: TaskListRow[];
  showClient?: boolean;
  showAssignee?: boolean;
  compact?: boolean;
  caption?: string;
  /** Quando informado, mostra cronômetro e ações rápidas (editar, mudar o dia, excluir). */
  actor?: Actor;
  running?: { taskId: string; startedAt: string } | null;
}) {
  const now = new Date();
  return (
    <div className="overflow-x-auto">
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">Tarefa</th>
            {showClient && !compact && <th scope="col">Cliente</th>}
            <th scope="col">Prazo</th>
            <th scope="col">Status</th>
            {!compact && <th scope="col">Prioridade</th>}
            {showAssignee && <th scope="col">Responsável</th>}
            {actor && (
              <th scope="col" className="text-right">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const overdue = isOverdue({ status: t.status as TaskStatus, dueAt: t.dueAt }, now);
            const done = t.checklistItems.filter((i) => i.done).length;
            return (
              <tr key={t.id} className={cx(overdue && "bg-red-50/40")}>
                <td className={cx("max-w-md", compact ? "min-w-[11rem]" : "min-w-[15rem]")}>
                  <Link href={`/tarefas/${t.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                    {t.title}
                  </Link>
                  {showClient && compact && (
                    <Link href={`/clientes/${t.client.id}`} className="block text-xs font-medium text-brand-700 hover:underline">
                      {t.client.tradeName}
                    </Link>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{CATEGORY_LABEL[t.category as TaskCategory]}</span>
                    {t.competence && <span>Comp. {fmtCompetence(t.competence)}</span>}
                    {t.origin === "RECORRENTE" && (
                      <span className="inline-flex items-center gap-0.5" title="Gerada por rotina recorrente">
                        <Repeat aria-hidden className="h-3 w-3" /> Rotina
                      </span>
                    )}
                    {t.checklistItems.length > 0 && (
                      <span title="Itens do checklist concluídos" className="tabular-nums">
                        ☑ {done}/{t.checklistItems.length}
                      </span>
                    )}
                    {t.returnCount > 0 && t.status === "EM_ANDAMENTO" && (
                      <span className="font-medium text-orange-700">Devolvida pelo revisor</span>
                    )}
                  </div>
                </td>
                {showClient && !compact && (
                  <td className="whitespace-nowrap">
                    <Link href={`/clientes/${t.client.id}`} className="hover:underline">
                      {t.client.tradeName}
                    </Link>
                  </td>
                )}
                <td className="whitespace-nowrap">
                  <DueDate dueAt={t.dueAt} status={t.status as TaskStatus} now={now} />
                </td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={t.status as TaskStatus} />
                    {overdue && <OverdueBadge />}
                  </div>
                </td>
                {!compact && (
                  <td>
                    <PriorityBadge priority={t.priority as Priority} />
                  </td>
                )}
                {showAssignee && <td className="whitespace-nowrap">{t.assignee?.name ?? <span className="text-slate-400">Sem responsável</span>}</td>}
                {actor && (
                  <td className="whitespace-nowrap">
                    <TaskRowTools
                      taskId={t.id}
                      title={t.title}
                      dueDate={instantToLocalDate(t.dueAt, APP_TIMEZONE)}
                      rights={taskRights(actor, { status: t.status as TaskStatus, assigneeId: t.assigneeId, reviewerId: t.reviewerId, createdById: t.createdById, origin: t.origin })}
                      runningSince={running?.taskId === t.id ? running.startedAt : null}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
