import { PageHeader } from "@/components/ui/layout";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { saveCultureAction } from "@/app/actions/culture";
import { valuesToText } from "@/domain/culture";
import { requirePermission } from "@/server/context";
import { getCulture } from "@/server/services/culture";

export const metadata = { title: "Editar missão, visão e valores" };

export default async function EditCulturaPage() {
  const actor = await requirePermission("org.settings");
  const c = await getCulture(actor);
  return (
    <>
      <PageHeader title="Missão, visão e valores" breadcrumb={{ href: "/cultura", label: "Voltar" }} />
      <ActionForm action={saveCultureAction} className="card max-w-3xl space-y-5 p-6">
        <Field label="🎯 Missão" name="mission" hint="Por que a empresa existe e o que entrega.">
          <textarea id="mission" name="mission" rows={3} className="input" defaultValue={c.mission} />
        </Field>
        <Field label="🔭 Visão" name="vision" hint="Onde a empresa quer chegar.">
          <textarea id="vision" name="vision" rows={3} className="input" defaultValue={c.vision} />
        </Field>
        <Field label="💎 Valores" name="values" hint="Um valor por linha, assim: 💙 | Transparência | Mostramos os números como eles são.">
          <textarea id="values" name="values" rows={8} className="input font-mono text-sm" defaultValue={valuesToText(c.values)} placeholder={"💙 | Transparência | Mostramos os números como eles são.\n🤝 | Parceria | Crescemos junto com o cliente."} />
        </Field>
        <SubmitButton>Salvar</SubmitButton>
      </ActionForm>
    </>
  );
}
