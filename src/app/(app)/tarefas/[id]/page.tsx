import Link from "next/link";
import { AlertTriangle, ExternalLink, Pencil, Repeat, Undo2 } from "lucide-react";
import { dbDateToLocalDate, instantToLocalDate } from "@/domain/dates";
import { CATEGORY_LABEL, PENDING_TYPE_LABEL, type Priority, type TaskCategory, type TaskStatus } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { availableActions, completionBlockers, isOverdue, taskRights } from "@/domain/task-rules";
import { TaskTimer } from "@/components/task-timer";
import { DeleteTaskButton, RescheduleButton } from "@/components/task-row-tools";
import { Card, PageHeader } from "@/components/ui/layout";
import { OverdueBadge, PriorityBadge, StatusBadge, DueDate } from "@/components/ui/badges";
import { TaskActions } from "@/components/task-actions";
import { DeleteTimeButton, LogTimeForm } from "@/components/time-entry";
import {
  AddChecklistItemForm,
  AddEvidenceForm,
  ChecklistItemRow,
  CommentForm,
  PendingFollowUpForm,
  RemoveEvidenceButton,
} from "@/components/task-work";
import { fmtCompetence, fmtDateTime, fmtLocalDate, fmtMinutes, waitingTime } from "@/lib/format";
import { APP_TIMEZONE } from "@/server/config";
import { requireActor } from "@/server/context";
import { getTaskDetail } from "@/server/services/tasks";
import { publishedByCategory } from "@/server/services/procedures";
import { listTaskTime } from "@/server/services/time";
import { getRunningTimer, taskTrackedSeconds } from "@/server/services/timer";
import { orNotFound } from "@/server/page-utils";

export const metadata = { title: "Tarefa" };

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const { id } = await params;
  const sp = await searchParams;
  const task = await orNotFound(getTaskDetail(actor, id));
  const [timeEntries, pops, running, trackedSeconds] = await Promise.all([
    listTaskTime(actor, id),
    publishedByCategory(actor, task.category as TaskCategory),
    getRunningTimer(actor),
    taskTrackedSeconds(id),
  ]);
  const linkedPop = task.recurrence?.template.procedure && task.recurrence.template.procedure.status !== "ARQUIVADO" ? task.recurrence.template.procedure : null;
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const trackedMinutes = timeEntries.reduce((acc, e) => acc + e.minutes, 0);
  const status = task.status as TaskStatus;
  const now = new Date();
  const overdue = isOverdue({ status, dueAt: task.dueAt }, now);
  const closed = status === "CONCLUIDA" || status === "CANCELADA";
  const manager = can(actor, "tasks.plan");
  const canWork = manager || task.assigneeId === actor.userId || task.reviewerId === actor.userId;
  const snapshot = {
    status,
    assigneeId: task.assigneeId,
    reviewerId: task.reviewerId,
    requiresEvidence: task.requiresEvidence,
    checklist: task.checklistItems,
    evidenceCount: task.evidences.length,
  };
  const actions = availableActions(snapshot, actor);
  const rights = taskRights(actor, { status, assigneeId: task.assigneeId, reviewerId: task.reviewerId, createdById: task.createdById, origin: task.origin });
  const mine = running?.taskId === task.id ? running.startedAt : null;
  const finishAction = (["COMPLETE", "APPROVE", "SUBMIT_REVIEW"] as const).find((a) => actions.includes(a));
  const blockers = completionBlockers(snapshot);
  const openPending = task.pendings.find((p) => !p.resolvedAt);
  const doneCount = task.checklistItems.filter((i) => i.done).length;

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/tarefas", label: "Tarefas" }}
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/clientes/${task.client.id}`} className="font-medium text-brand-700 hover:underline">
              {task.client.tradeName}
            </Link>
            <span aria-hidden>·</span>
            <span>{CATEGORY_LABEL[task.category as TaskCategory]}</span>
            {task.competence && (
              <>
                <span aria-hidden>·</span>
                <span>Competência {fmtCompetence(task.competence)}</span>
              </>
            )}
          </span>
        }
        actions={
          <>
            {rights.canReschedule && <RescheduleButton taskId={task.id} dueDate={instantToLocalDate(task.dueAt, APP_TIMEZONE)} />}
            {rights.canEdit && (
              <Link href={`/tarefas/${task.id}/editar`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
            {rights.canDelete && <DeleteTaskButton taskId={task.id} title={task.title} redirectTo="/tarefas" withLabel />}
          </>
        }
      />

      {sp.criada && (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Tarefa criada com sucesso.
        </p>
      )}

      <div className="card mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          {overdue && <OverdueBadge />}
          <PriorityBadge priority={task.priority as Priority} />
          <span className="text-sm text-slate-600">
            Prazo: <DueDate dueAt={task.dueAt} status={status} now={now} />
          </span>
        </div>
        <TaskActions taskId={task.id} taskTitle={task.title} actions={actions.filter((a) => !["START", "COMPLETE", "SUBMIT_REVIEW", "APPROVE"].includes(a) || !rights.canTime)} />
      </div>

      {!closed && (
        <div className="mb-6">
          <TaskTimer
            taskId={task.id}
            runningSince={mine}
            trackedSeconds={trackedSeconds}
            otherRunning={!!running && running.taskId !== task.id}
            disabled={!rights.canTime}
            disabledReason={status === "AGUARDANDO_CLIENTE" || status === "AGUARDANDO_TERCEIRO" ? "A tarefa está aguardando retorno. Retome-a para cronometrar." : "Você precisa ser o responsável, o revisor ou gestor para cronometrar esta tarefa."}
            canFinish={!!finishAction}
            finishLabel={finishAction === "SUBMIT_REVIEW" ? "Enviar para revisão" : finishAction === "APPROVE" ? "Aprovar e concluir" : "Concluir"}
          />
        </div>
      )}

      {status === "EM_ANDAMENTO" && task.returnCount > 0 && task.lastReturnReason && (
        <div role="note" className="mb-4 flex gap-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <Undo2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Devolvida pelo revisor ({task.returnCount}×)</p>
            <p>{task.lastReturnReason}</p>
          </div>
        </div>
      )}

      {openPending && (
        <div role="note" className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">
            Pendência com {PENDING_TYPE_LABEL[openPending.type].toLowerCase()} há {waitingTime(openPending.requestedAt, now)}
          </p>
          <p className="mt-1">{openPending.reason}</p>
          <p className="mt-1 text-xs">
            Solicitado em {fmtDateTime(openPending.requestedAt)} por {openPending.createdBy.name}
            {openPending.respondent && ` · Responder: ${openPending.respondent}`} · Próximo acompanhamento:{" "}
            <strong>{fmtLocalDate(dbDateToLocalDate(openPending.followUpAt))}</strong>
          </p>
          {(manager || task.assigneeId === actor.userId) && (
            <PendingFollowUpForm
              pendingId={openPending.id}
              followUp={dbDateToLocalDate(openPending.followUpAt)}
              respondent={openPending.respondent}
            />
          )}
        </div>
      )}

      {!closed && blockers.length > 0 && (
        <div role="note" className="mb-4 flex gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Para concluir{task.reviewerId ? " ou enviar para revisão" : ""}:</p>
            <ul className="list-disc pl-5">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {task.description && (
            <Card title="Descrição">
              <p className="text-sm whitespace-pre-wrap text-slate-700">{task.description}</p>
            </Card>
          )}

          <Card title="Checklist" description={task.checklistItems.length ? `${doneCount} de ${task.checklistItems.length} concluídos` : undefined}>
            {task.checklistItems.length ? (
              <ul className="divide-y divide-slate-100">
                {task.checklistItems.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    required={item.required}
                    done={item.done}
                    doneInfo={item.done && item.doneBy ? `por ${item.doneBy.name} em ${fmtDateTime(item.doneAt)}` : undefined}
                    editable={canWork && !closed}
                    removable={canWork && !closed && (!item.required || manager)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sem itens de checklist.</p>
            )}
            {canWork && !closed && <AddChecklistItemForm taskId={task.id} allowRequired={manager} />}
          </Card>

          <Card title="Evidências" description={task.requiresEvidence ? "Obrigatória ao menos uma evidência para concluir." : "Links para comprovantes, planilhas ou pastas."}>
            {task.evidences.length ? (
              <ul className="divide-y divide-slate-100">
                {task.evidences.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 py-2 text-sm">
                    <ExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand-700 hover:underline">
                        {e.description || e.url}
                      </a>
                      <p className="text-xs text-slate-500">
                        {e.addedBy.name} · {fmtDateTime(e.createdAt)}
                      </p>
                    </div>
                    {!closed && (manager || e.addedById === actor.userId) && <RemoveEvidenceButton id={e.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma evidência registrada.</p>
            )}
            {canWork && !closed && <AddEvidenceForm taskId={task.id} />}
          </Card>

          <Card
            title="Horas apontadas"
            description={timeEntries.length ? `Total: ${fmtMinutes(trackedMinutes)}${task.estimatedMinutes ? ` de ${fmtMinutes(task.estimatedMinutes)} estimados` : ""}` : "Registre o tempo trabalhado para medir a rentabilidade do cliente."}
          >
            {timeEntries.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {timeEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-20 shrink-0 tabular-nums text-slate-500">{fmtLocalDate(e.workedOn)}</span>
                    <span className="w-16 shrink-0 font-medium tabular-nums">{fmtMinutes(e.minutes)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {e.userName}
                      {e.note && ` · ${e.note}`}
                    </span>
                    {(manager || e.userId === actor.userId) && <DeleteTimeButton id={e.id} />}
                  </li>
                ))}
              </ul>
            )}
            {canWork && <LogTimeForm taskId={task.id} today={today} />}
          </Card>

          <Card title="Comentários">
            {task.comments.length ? (
              <ul className="space-y-3">
                {task.comments.map((c) => (
                  <li key={c.id} className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">{c.author.name}</strong> · {fmtDateTime(c.createdAt)}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhum comentário ainda.</p>
            )}
            <CommentForm taskId={task.id} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Detalhes">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Responsável</dt>
              <dd>{task.assignee?.name ?? "Sem responsável"}</dd>
              <dt className="text-slate-500">Revisor</dt>
              <dd>{task.reviewer?.name ?? "—"}</dd>
              <dt className="text-slate-500">Início</dt>
              <dd>{fmtDateTime(task.startAt)}</dd>
              <dt className="text-slate-500">Prazo</dt>
              <dd>{fmtDateTime(task.dueAt)}</dd>
              <dt className="text-slate-500">Estimativa</dt>
              <dd>{fmtMinutes(task.estimatedMinutes)}</dd>
              <dt className="text-slate-500">Projeto</dt>
              <dd>
                {task.project ? (
                  <Link className="text-brand-700 hover:underline" href={`/projetos/${task.project.id}`}>
                    {task.project.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-slate-500">Origem</dt>
              <dd>
                {task.origin === "RECORRENTE" ? (
                  <span className="inline-flex items-center gap-1">
                    <Repeat aria-hidden className="h-3.5 w-3.5" />
                    {task.recurrence && manager ? (
                      <Link className="text-brand-700 hover:underline" href={`/rotinas/recorrencias/${task.recurrence.id}`}>
                        {task.recurrence.template.name}
                      </Link>
                    ) : (
                      task.recurrence?.template.name ?? "Rotina recorrente"
                    )}
                  </span>
                ) : (
                  "Manual"
                )}
              </dd>
              <dt className="text-slate-500">Criada</dt>
              <dd>
                {fmtDateTime(task.createdAt)}
                {task.createdBy ? ` por ${task.createdBy.name}` : " (automática)"}
              </dd>
              {task.executedBy && (
                <>
                  <dt className="text-slate-500">Executada</dt>
                  <dd>
                    {task.executedBy.name} · {fmtDateTime(task.executedAt)}
                  </dd>
                </>
              )}
              {task.reviewedBy && (
                <>
                  <dt className="text-slate-500">Revisada</dt>
                  <dd>
                    {task.reviewedBy.name} · {fmtDateTime(task.reviewedAt)}
                  </dd>
                </>
              )}
              {task.completedBy && (
                <>
                  <dt className="text-slate-500">Concluída</dt>
                  <dd>
                    {task.completedBy.name} · {fmtDateTime(task.completedAt)}
                    {task.completedAt && (
                      <span className={task.completedAt <= task.dueAt ? "block text-xs text-emerald-700" : "block text-xs text-red-700"}>
                        {task.completedAt <= task.dueAt ? "Dentro do prazo" : "Após o prazo"}
                      </span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </Card>

          {linkedPop && (
            <Card title="Como fazer (POP da rotina)" description={linkedPop.title}>
              {linkedPop.objective && <p className="mb-3 text-sm text-slate-600">{linkedPop.objective}</p>}
              <ol className="space-y-2 text-sm text-slate-800">
                {linkedPop.content
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
              </ol>
              <Link className="mt-3 inline-block text-xs text-brand-700 hover:underline" href={`/pops/${linkedPop.id}`}>
                Abrir POP completo
              </Link>
            </Card>
          )}

          {!linkedPop && pops.length > 0 && (
            <Card title="Como fazer (POPs)" description="Procedimentos publicados desta área">
              <ul className="space-y-1 text-sm">
                {pops.map((p) => (
                  <li key={p.id}>
                    <Link className="text-brand-700 hover:underline" href={`/pops/${p.id}`}>
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {task.pendings.length > 0 && (
            <Card title="Pendências">
              <ul className="space-y-2 text-sm">
                {task.pendings.map((p) => (
                  <li key={p.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="font-medium">{p.reason}</p>
                    <p className="text-xs text-slate-500">
                      {PENDING_TYPE_LABEL[p.type]} · {fmtDateTime(p.requestedAt)}
                      {p.resolvedAt ? ` · resolvida em ${fmtDateTime(p.resolvedAt)} (${p.resolution ?? "—"})` : " · em aberto"}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Histórico" description="Trilha de auditoria da tarefa">
            <ol className="space-y-3">
              {task.auditEvents.map((e) => (
                <li key={e.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <p>{e.summary}</p>
                  <p className="text-xs text-slate-500">
                    {e.actor?.name ?? "Sistema"} · {fmtDateTime(e.createdAt)}
                  </p>
                  {e.action === "task.updated" && e.changes && (
                    <details className="mt-1 text-xs text-slate-600">
                      <summary className="cursor-pointer">Ver alterações</summary>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(e.changes as Record<string, { de: unknown; para: unknown }>).map(([k, v]) => (
                          <li key={k}>
                            <strong>{k}</strong>: {String(v.de ?? "—")} → {String(v.para ?? "—")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
