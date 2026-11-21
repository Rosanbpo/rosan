import { PageHeader } from "@/components/ui/layout";
import { NewTaskLoader } from "@/components/new-task-loader";

export const metadata = { title: "Nova tarefa" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHeader title="Nova tarefa" breadcrumb={{ href: "/tarefas", label: "Tarefas" }} />
      <NewTaskLoader sp={await searchParams} />
    </>
  );
}
