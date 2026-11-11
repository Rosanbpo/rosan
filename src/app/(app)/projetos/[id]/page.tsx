import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { PROJECT_STATUS_LABEL, type Priority, type ProjectStatus, type TaskStatus } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { DueDate, PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { fmtHours, fmtLocalDate } from "@/lib/format";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProject } from "@/server/services/projects";

export const metadata = { title: "Projeto" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const { project, tasks, minutes } = await orNotFound(getProject(actor, id));
  const manage = can(actor, "projects.manage");
  const active = tasks.filter((t) => t.status !== "CANCELADA");
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Progresso" value={`${pct}%`} hint={`${done} de ${active.length} tarefas`} tone="success" />
        <Stat label="Início" value={project.startLocal ? fmtLocalDate(project.startLocal) : "—"} />
        <Stat label="Prazo final" value={project.dueLocal ? fmtLocalDate(project.dueLocal) : "—"} />
        <Stat label="Horas apontadas" value={fmtHours(minutes)} hint={project.owner ? `Responsável: ${project.owner.name}` : undefined} />
      </div>

      {project.description && (
        <Card title="Descrição" className="mb-6">
          <p className="text-sm whitespace-pre-wrap text-slate-700">{project.description}</p>
        </Card>
      )}

      <Card title="Tarefas do projeto" bodyClassName="p-0">
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
