import Link from "next/link";
import type { Priority, TaskStatus } from "@/domain/enums";
import { availableActions, isOverdue } from "@/domain/task-rules";
import type { Actor } from "@/domain/permissions";
import type { TaskListRow } from "@/server/services/tasks";
import { DueDate, OverdueBadge, PriorityBadge, StatusBadge } from "./ui/badges";
import { TaskActions } from "./task-actions";
import { EmptyState } from "./ui/layout";

/** Lista de tarefas com ações rápidas (poucos cliques), usada em "Minha operação". */
export function MyTaskList({ rows, actor, empty }: { rows: TaskListRow[]; actor: Actor; empty: string }) {
  if (rows.length === 0) return <EmptyState title={empty} />;
  const now = new Date();
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((t) => {
        const status = t.status as TaskStatus;
        const actions = availableActions(
          {
            status,
            assigneeId: t.assigneeId,
            reviewerId: t.reviewerId,
            requiresEvidence: t.requiresEvidence,
            checklist: t.checklistItems,
            evidenceCount: 0,
          },
          actor,
        ).filter((a) => a !== "CANCEL" && a !== "TO_TODO");
        const done = t.checklistItems.filter((i) => i.done).length;
        return (
          <li key={t.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Link href={`/tarefas/${t.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                {t.title}
              </Link>
              <p className="text-sm text-slate-600">{t.client.tradeName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge status={status} />
                {isOverdue({ status, dueAt: t.dueAt }, now) && <OverdueBadge />}
                <PriorityBadge priority={t.priority as Priority} />
                {t.checklistItems.length > 0 && (
                  <span className="text-slate-500">
                    Checklist {done}/{t.checklistItems.length}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-sm">
                <DueDate dueAt={t.dueAt} status={status} now={now} />
              </span>
              <TaskActions taskId={t.id} taskTitle={t.title} actions={actions} size="sm" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
