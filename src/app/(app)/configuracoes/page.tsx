import { Card, PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { runSchedulerNowAction, updateHourCostAction, updateOrganizationAction } from "@/app/actions/settings";
import { moneyInput } from "@/lib/format";
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
            <p className="text-xs text-slate-500">Os dados abaixo aparecem nas propostas e contratos.</p>
            <Field label="Razão social" name="legalName">
              <input id="legalName" name="legalName" className="input" defaultValue={org.legalName ?? ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CNPJ" name="cnpj">
                <input id="cnpj" name="cnpj" className="input" inputMode="numeric" defaultValue={org.cnpj ?? ""} placeholder="00.000.000/0000-00" />
              </Field>
              <Field label="Cidade/UF" name="city">
                <input id="city" name="city" className="input" defaultValue={org.city ?? ""} placeholder="São Paulo/SP" />
              </Field>
              <Field label="E-mail comercial" name="email">
                <input id="email" name="email" type="email" className="input" defaultValue={org.email ?? ""} />
              </Field>
              <Field label="Telefone / WhatsApp" name="phone">
                <input id="phone" name="phone" className="input" defaultValue={org.phone ?? ""} />
              </Field>
            </div>
            <Field label="Site ou Instagram" name="website">
              <input id="website" name="website" className="input" defaultValue={org.website ?? ""} placeholder="rosanfinancas.com.br" />
            </Field>
            <p className="text-xs text-slate-500">Fuso horário das rotinas: {APP_TIMEZONE} (variável APP_TIMEZONE).</p>
            <SubmitButton>Salvar</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Custo da hora" description="Usado na rentabilidade por cliente (Carteira).">
          <ActionForm action={updateHourCostAction} className="space-y-4">
            <Field label="Custo médio da hora de trabalho (R$)" name="hourCost" hint="Some salários, encargos e custos fixos e divida pelas horas produtivas do mês.">
              <input id="hourCost" name="hourCost" inputMode="decimal" className="input" defaultValue={moneyInput(org.hourCost === null ? null : Number(org.hourCost))} placeholder="45,00" />
            </Field>
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
