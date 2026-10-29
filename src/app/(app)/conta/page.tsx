import { Card, PageHeader } from "@/components/ui/layout";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { changeOwnPasswordAction } from "@/app/actions/settings";
import { ROLE_LABEL } from "@/domain/enums";
import { requireActor } from "@/server/context";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const actor = await requireActor();
  return (
    <>
      <PageHeader title="Minha conta" description={`${actor.name} · ${ROLE_LABEL[actor.role]}`} />
      <Card title="Alterar senha" className="max-w-md">
        <ActionForm action={changeOwnPasswordAction} className="space-y-3" resetOnSuccess>
          <Field label="Senha atual" name="current" required>
            <input id="current" type="password" name="current" required className="input" autoComplete="current-password" />
          </Field>
          <Field label="Nova senha" name="next" required hint="Mínimo de 8 caracteres.">
            <input id="next" type="password" name="next" minLength={8} required className="input" autoComplete="new-password" />
          </Field>
          <Field label="Confirme a nova senha" name="confirm" required>
            <input id="confirm" type="password" name="confirm" minLength={8} required className="input" autoComplete="new-password" />
          </Field>
          <SubmitButton>Alterar senha</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
