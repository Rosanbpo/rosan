import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { PROJECT_STATUS_LABEL, type Priority, type ProjectStatus, type TaskStatus } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { DueDate, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { fmtHours, fmtLocalDate } from "@/lib/format";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProject } from "@/server/services/projects";
import { ProjectCalendar } from "@/components/project-calendar";
import { instantToLocalDate, localDateTimeToInstant, makeLocalDate } from "@/domain/dates";
import { isCompetence, shiftCompetence } from "@/domain/documents";
import { APP_TIMEZONE } from "@/server/config";
import { getDocumentChecklist } from "@/server/services/documents";
import { fmtCompetence } from "@/lib/format";

export const metadata = { title: "Projeto" };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const { id } = await params;
  const sp = await searchParams;
  const nowLocal = instantToLocalDate(new Date(), APP_TIMEZONE);
  // Projetos com rotinas vinculadas abrem no mês atual; os demais, em todo o período.
  const first = await orNotFound(getProject(actor, id, { from: new Date(0), to: new Date(0) }));
  const wanted = sp.mes === "tudo" ? null : isCompetence(sp.mes) ? sp.mes : first.recurring ? nowLocal.slice(0, 7) : null;
  const range = wanted
    ? (() => {
        const [y, m] = wanted.split("-").map(Number);
        const next = shiftCompetence(wanted, 1);
        return {
          from: localDateTimeToInstant(makeLocalDate(y, m, 1), "00:00", APP_TIMEZONE),
          to: localDateTimeToInstant(`${next}-01`, "00:00", APP_TIMEZONE),
        };
      })()
    : undefined;
  const { project, tasks: monthTasks, minutes } = await orNotFound(getProject(actor, id, range));
  const day = wanted && sp.dia?.startsWith(wanted) ? sp.dia : undefined;
  const tasks = day ? monthTasks.filter((t) => instantToLocalDate(t.dueAt, APP_TIMEZONE) === day) : monthTasks;
  const docs = wanted && project.clientId ? await getDocumentChecklist(actor, project.clientId, wanted) : null;
  const hrefFor = (d: string | null) => `/projetos/${id}?mes=${wanted}${d ? `&dia=${d}` : ""}`;
  const manage = can(actor, "projects.manage");
  const active = monthTasks.filter((t) => t.status !== "CANCELADA");
  const done = active.filter((t) => t.status === "CONCLUIDA").length;
  const pct = active.length ? Math.round((done / active.length) * 100) : 0;
  const now = new Date();

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/projetos", label: "Projetos" }}
        title={project.name}
        description={
          <span>
            {PROJECT_STATUS_LABEL[project.status as ProjectStatus]} ·{" "}
            {project.client ? (
              <Link href={`/clientes/${project.client.id}`} className="font-medium text-brand-700 hover:underline">
                {project.client.tradeName}
              </Link>
            ) : (
              "Projeto interno"
            )}
          </span>
        }
        actions={
          <>
            {can(actor, "tasks.create") && (
              <Link href={`/tarefas/nova?projectId=${id}${project.clientId ? `&clientId=${project.clientId}` : ""}`} className="btn-secondary">
                <Plus aria-hidden className="h-4 w-4" /> Nova tarefa
              </Link>
            )}
            {manage && (
              <Link href={`/projetos/${id}/editar`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
          </>
        }
      />
      {first.recurring || wanted ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {wanted ? (
            <>
              <Link aria-label="Mês anterior" className="icon-btn" href={`/projetos/${id}?mes=${shiftCompetence(wanted, -1)}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="min-w-20 text-center text-sm font-semibold">{fmtCompetence(wanted)}</span>
              <Link aria-label="Próximo mês" className="icon-btn" href={`/projetos/${id}?mes=${shiftCompetence(wanted, 1)}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link className="ml-2 text-sm text-brand-700 hover:underline" href={`/projetos/${id}?mes=tudo`}>
                Ver todo o período
              </Link>
            </>
          ) : (
            <Link className="text-sm text-brand-700 hover:underline" href={`/projetos/${id}?mes=${nowLocal.slice(0, 7)}`}>
              Ver por mês (calendário e documentos)
            </Link>
          )}
        </div>
      ) : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={wanted ? "Progresso do mês" : "Progresso"} value={`${pct}%`} hint={`${done} de ${active.length} tarefas`} tone="success" />
        <Stat label="Início" value={project.startLocal ? fmtLocalDate(project.startLocal) : "—"} />
        <Stat label="Prazo final" value={project.dueLocal ? fmtLocalDate(project.dueLocal) : "—"} />
        <Stat label="Horas apontadas" value={fmtHours(minutes)} hint={project.owner ? `Responsável: ${project.owner.name}` : undefined} />
      </div>

      {project.description && (
        <Card title="Descrição" className="mb-6">
          <p className="text-sm whitespace-pre-wrap text-slate-700">{project.description}</p>
        </Card>
      )}

      {wanted && (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card title="Calendário do mês" description="Clique em um dia para ver só as tarefas dele" className="lg:col-span-2">
            <ProjectCalendar
              competence={wanted}
              selectedDay={day}
              hrefFor={hrefFor}
              tasks={monthTasks
                .filter((t) => t.status !== "CANCELADA")
                .map((t) => ({
                  day: instantToLocalDate(t.dueAt, APP_TIMEZONE),
                  status: t.status,
                  overdue: t.status !== "CONCLUIDA" && t.dueAt < now,
                }))}
            />
          </Card>
          <div className="space-y-6">
            <Card title="O que falta no mês">
              {(() => {
                const open = monthTasks.filter((t) => t.status !== "CONCLUIDA" && t.status !== "CANCELADA");
                const late = open.filter((t) => t.dueAt < now).length;
                return (
                  <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
                    <dt className="text-slate-500">Tarefas abertas</dt>
                    <dd className="font-semibold tabular-nums">{open.length}</dd>
                    <dt className="text-slate-500">Atrasadas</dt>
                    <dd className={`font-semibold tabular-nums ${late ? "text-red-700" : ""}`}>{late}</dd>
                    <dt className="text-slate-500">Concluídas</dt>
                    <dd className="font-semibold text-emerald-700 tabular-nums">{done}</dd>
                  </dl>
                );
              })()}
            </Card>
            {docs && (
              <Card
                title={`Documentos de ${fmtCompetence(wanted)}`}
                actions={
                  <Link className="text-sm text-brand-700 hover:underline" href={`/clientes/${project.clientId}?aba=documentos&competencia=${wanted}`}>
                    Abrir
                  </Link>
                }
              >
                {docs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum documento configurado para o cliente.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {docs.map((d) => (
                      <li key={d.id} className={d.receivedAt ? "text-slate-500" : "font-medium text-amber-800"}>
                        {d.receivedAt ? "✓" : "•"} {d.name}
                        {!d.required && <span className="ml-1 text-xs text-slate-400">(opcional)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      <Card title={day ? `Tarefas do dia ${fmtLocalDate(day)}` : wanted ? "Tarefas do mês" : "Tarefas do projeto"} bodyClassName="p-0">
        {tasks.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhuma tarefa vinculada. Crie uma tarefa e escolha este projeto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Tarefas do projeto</caption>
              <thead>
                <tr>
                  <th scope="col">Tarefa</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tarefas/${t.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td>{t.client.tradeName}</td>
                    <td>
                      <StatusBadge status={t.status as TaskStatus} />
                    </td>
                    <td>
                      <PriorityBadge priority={t.priority as Priority} />
                    </td>
                    <td>{t.assignee?.name ?? "—"}</td>
                    <td>
                      <DueDate dueAt={t.dueAt} status={t.status as TaskStatus} now={now} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
