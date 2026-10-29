import { Card, PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { runSchedulerNowAction, updateOrganizationAction } from "@/app/actions/settings";
import { fmtDateTime } from "@/lib/format";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { prisma } from "@/server/db";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const actor = await requirePermission("org.settings");
  const [org, runs] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } }),
    prisma.schedulerRun.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: actor.organizationId }] },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsNav current="/configuracoes" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Empresa">
          <ActionForm action={updateOrganizationAction} className="space-y-4">
            <Field label="Nome da empresa de BPO" name="name" required>
              <input id="name" name="name" required className="input" defaultValue={org.name} />
            </Field>
            <p className="text-xs text-slate-500">Fuso horário das rotinas: {APP_TIMEZONE} (variável APP_TIMEZONE).</p>
            <SubmitButton>Salvar</SubmitButton>
          </ActionForm>
        </Card>
        <Card
          title="Geração de tarefas recorrentes"
          description="Em produção, a geração roda por agendamento no servidor (cron). Veja o README."
          actions={
            <ConfirmAction
              action={runSchedulerNowAction}
              label="Executar agora"
              className="btn-secondary btn-sm"
              confirm="Executar a geração agora para esta empresa? A execução é idempotente e não duplica tarefas."
            />
          }
        >
          {runs.length ? (
            <table className="table">
              <caption className="sr-only">Últimas execuções do agendador</caption>
              <thead>
                <tr>
                  <th scope="col">Início</th>
                  <th scope="col">Origem</th>
                  <th scope="col" className="text-right">Criadas</th>
                  <th scope="col" className="text-right">Existentes</th>
                  <th scope="col" className="text-right">Erros</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(r.startedAt)}</td>
                    <td className="text-xs">{r.trigger.split(":")[0]}</td>
                    <td className="text-right tabular-nums">{r.created}</td>
                    <td className="text-right tabular-nums">{r.skipped}</td>
                    <td className={`text-right tabular-nums ${r.errors ? "font-semibold text-red-700" : ""}`}>{r.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-amber-700">Nenhuma execução registrada. Configure o agendador conforme o README.</p>
          )}
        </Card>
      </div>
    </>
  );
}
