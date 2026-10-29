import { AlertTriangle } from "lucide-react";
import {
  CLIENT_STATUS_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type ClientStatus,
  type Priority,
  type TaskStatus,
} from "@/domain/enums";
import { isOverdue } from "@/domain/task-rules";
import { fmtDateTime, relativeDays } from "@/lib/format";
import { CLIENT_STATUS_STYLE, PRIORITY_STYLE, STATUS_DOT, STATUS_STYLE, cx } from "@/lib/ui";

const pill = "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cx(pill, STATUS_STYLE[status])}>
      <span aria-hidden className={cx("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <span className={cx(pill, CLIENT_STATUS_STYLE[status])}>{CLIENT_STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const bars = { BAIXA: 1, NORMAL: 2, ALTA: 3, CRITICA: 4 }[priority];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", PRIORITY_STYLE[priority])}>
      <span aria-hidden className="flex items-end gap-px">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cx("w-0.5 rounded-sm", i <= bars ? "bg-current" : "bg-slate-200")}
            style={{ height: 3 + i * 2 }}
          />
        ))}
      </span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={cx(pill, "bg-red-50 text-red-700 ring-red-200")}>
      <AlertTriangle aria-hidden className="h-3 w-3" />
      Atrasada
    </span>
  );
}

/** Prazo com destaque de atraso calculado (nunca para concluídas/canceladas). */
export function DueDate({ dueAt, status, now = new Date() }: { dueAt: Date; status: TaskStatus; now?: Date }) {
  const overdue = isOverdue({ status, dueAt }, now);
  const closed = status === "CONCLUIDA" || status === "CANCELADA";
  return (
    <span className="flex flex-col">
      <span className={cx("whitespace-nowrap", overdue && "font-semibold text-red-700")}>{fmtDateTime(dueAt)}</span>
      {!closed && (
        <span className={cx("text-xs", overdue ? "text-red-600" : "text-slate-500")}>
          {overdue ? `Atrasada ${relativeDays(dueAt, now)}` : `Vence ${relativeDays(dueAt, now)}`}
        </span>
      )}
    </span>
  );
}
