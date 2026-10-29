import { PageHeader } from "@/components/ui/layout";
import { TemplateForm } from "@/components/routine-forms";
import { DEFAULT_RULE } from "@/components/rule-fields";
import { createTemplateAction } from "@/app/actions/routines";
import { requirePermission } from "@/server/context";

export const metadata = { title: "Novo modelo" };

export default async function NewTemplatePage() {
  await requirePermission("templates.manage");
  return (
    <>
      <PageHeader title="Novo modelo de rotina" breadcrumb={{ href: "/rotinas?aba=modelos", label: "Modelos" }} />
      <TemplateForm
        action={createTemplateAction}
        submitLabel="Criar modelo"
        values={{
          ...DEFAULT_RULE,
          name: "",
          title: "",
          description: null,
          category: "OUTRAS",
          priority: "NORMAL",
          estimatedMinutes: null,
          requiresEvidence: false,
          competenceRule: "NONE",
          checklist: [],
        }}
      />
    </>
  );
}
