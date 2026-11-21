import { ModalShell } from "@/components/modal-shell";
import { NewTaskLoader } from "@/components/new-task-loader";

export default async function NewTaskModal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <ModalShell title="Nova tarefa">
      <NewTaskLoader sp={await searchParams} modal />
    </ModalShell>
  );
}
