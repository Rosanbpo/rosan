import { PageHeader } from "@/components/ui/layout";
import { ProjectForm } from "@/components/project-form";
import { createProjectAction } from "@/app/actions/projects";
import { requirePermission } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo projeto" };

export default async function NewProjectPage() {
  const actor = await requirePermission("projects.manage");
  const [clients, people] = await Promise.all([clientOptions(actor), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title="Novo projeto" breadcrumb={{ href: "/projetos", label: "Projetos" }} />
      <ProjectForm action={createProjectAction} clients={clients} people={people} submitLabel="Criar projeto" cancelHref="/projetos" />
    </>
  );
}
