import { PageHeader } from "@/components/ui/layout";
import { ProjectForm } from "@/components/project-form";
import { updateProjectAction } from "@/app/actions/projects";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { clientOptions } from "@/server/services/clients";
import { getProject } from "@/server/services/projects";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Editar projeto" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("projects.manage");
  const { id } = await params;
  const [{ project }, clients, people] = await Promise.all([orNotFound(getProject(actor, id)), clientOptions(actor), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title={`Editar ${project.name}`} breadcrumb={{ href: `/projetos/${id}`, label: "Voltar ao projeto" }} />
      <ProjectForm
        action={updateProjectAction.bind(null, id)}
        clients={clients}
        people={people}
        submitLabel="Salvar alterações"
        cancelHref={`/projetos/${id}`}
        values={{ ...project, startDate: project.startLocal, dueDate: project.dueLocal }}
      />
    </>
  );
}
