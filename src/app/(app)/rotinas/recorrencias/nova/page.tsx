import { PageHeader } from "@/components/ui/layout";
import { RecurrenceForm } from "@/components/routine-forms";
import { DEFAULT_RULE } from "@/components/rule-fields";
import { createRecurrenceAction } from "@/app/actions/routines";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { clientOptions } from "@/server/services/clients";
import { peopleWithClients } from "@/server/services/tasks";
import { templateOptions } from "@/server/services/routine-options";
import { str } from "@/server/page-utils";

export const metadata = { title: "Nova recorrência" };

export default async function NewRecurrencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("recurrences.manage");
  const sp = await searchParams;
  const [clients, templates, people] = await Promise.all([clientOptions(actor), templateOptions(actor), peopleWithClients(actor)]);
  const templateId = str(sp, "templateId") ?? "";
  const template = templates.find((t) => t.id === templateId);
  return (
    <>
      <PageHeader
        title="Nova recorrência"
        description="Ao salvar, as ocorrências que já estão dentro da antecedência são geradas imediatamente; as demais, pelo agendador."
        breadcrumb={{ href: "/rotinas", label: "Recorrências" }}
      />
      <RecurrenceForm
        action={createRecurrenceAction}
        mode="create"
        clients={clients}
        templates={templates}
        people={people}
        values={{
          ...(template?.rule ?? DEFAULT_RULE),
          clientId: str(sp, "clientId") ?? "",
          templateId,
          startDate: instantToLocalDate(new Date(), APP_TIMEZONE),
          endDate: null,
          assigneeId: null,
          reviewerId: null,
        }}
      />
    </>
  );
}
