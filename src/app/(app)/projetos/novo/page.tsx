import { Card, PageHeader } from "@/components/ui/layout";
import { ImplantationForm } from "@/components/implantation-form";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { ProjectForm } from "@/components/project-form";
import { createImplantationAction, createProjectAction } from "@/app/actions/projects";
import { requirePermission } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { assignableUsers } from "@/server/services/tasks";

export const metadata = { title: "Novo projeto" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const actor = await requirePermission("projects.manage");
  const [clients, people] = await Promise.all([clientOptions(actor), assignableUsers(actor)]);
  return (
    <>
      <PageHeader title="Novo projeto" breadcrumb={{ href: "/projetos", label: "Projetos" }} />
      <div className="mb-6">
        <Card title="Implantação de cliente novo" description="Cria o projeto com o roteiro padrão de tarefas, já com prazos.">
          <ImplantationForm
            action={createImplantationAction}
            clients={clients}
            people={people}
            clientId={sp.cliente}
            today={instantToLocalDate(new Date(), APP_TIMEZONE)}
          />
        </Card>
      </div>
      <p className="mb-2 text-sm font-medium text-slate-600">Ou crie um projeto em branco</p>
      <ProjectForm action={createProjectAction} clients={clients} people={people} submitLabel="Criar projeto" cancelHref="/projetos" />
    </>
  );
}
