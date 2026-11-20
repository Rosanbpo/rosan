import { Card, PageHeader } from "@/components/ui/layout";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { changeOwnPasswordAction } from "@/app/actions/settings";
import { ROLE_LABEL } from "@/domain/enums";
import { TwoFactorPanel } from "@/components/two-factor-panel";
import { setDigestAction } from "@/app/actions/signature";
import { mailConfigured } from "@/server/mail";
import { prisma } from "@/server/db";
import { requireActor } from "@/server/context";
import { twoFactorStatus } from "@/server/services/two-factor";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const actor = await requireActor();
  const tf = await twoFactorStatus(actor);
  const me = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { emailDigest: true, email: true } });
  return (
    <>
      <PageHeader title="Minha conta" description={`${actor.name} · ${ROLE_LABEL[actor.role]}`} />
      <Card title="Verificação em duas etapas" className="mb-6 max-w-xl">
        <TwoFactorPanel enabled={tf.enabled} recoveryLeft={tf.recoveryLeft} available={tf.available} />
      </Card>
      <Card title="Avisos por e-mail" description={`Resumo de segunda a sexta, por volta das 8h, com tarefas atrasadas e do dia. Vai para ${me.email}.`} className="mb-6 max-w-xl">
        <form action={setDigestAction} className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="on" defaultChecked={me.emailDigest} /> Receber o resumo diário por e-mail</label>
          {!mailConfigured() && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">O envio de e-mail ainda não foi ativado no sistema (faltam RESEND_API_KEY e MAIL_FROM na Vercel). Sua preferência fica salva.</p>}
          <button className="btn-primary btn-sm">Salvar</button>
        </form>
      </Card>
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
