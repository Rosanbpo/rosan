import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { ConfirmAction } from "@/components/confirm-action";
import { addHolidayAction, importHolidaysAction, removeHolidayAction } from "@/app/actions/settings";
import { instantToLocalDate, weekday } from "@/domain/dates";
import { WEEKDAY_LABEL } from "@/domain/enums";
import { fmtLocalDate } from "@/lib/format";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { listHolidays } from "@/server/services/holidays";

export const metadata = { title: "Feriados" };

export default async function HolidaysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("org.settings");
  const sp = await searchParams;
  const currentYear = Number(instantToLocalDate(new Date(), APP_TIMEZONE).slice(0, 4));
  const year = Number(sp.ano) >= 2000 && Number(sp.ano) <= 2100 ? Number(sp.ano) : currentYear;
  const holidays = await listHolidays(actor, year);
  return (
    <>
      <PageHeader title="Configurações" />
      <SettingsNav current="/configuracoes/feriados" />
      <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
        O calendário de feriados é <strong>mantido pela empresa</strong>. O sistema sugere apenas feriados nacionais (datas fixas e
        Sexta-feira Santa calculada pela Páscoa). Feriados estaduais e municipais dos clientes devem ser cadastrados manualmente.
        Alterações afetam somente as próximas gerações de tarefas.
      </p>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          title={`Feriados de ${year}`}
          className="xl:col-span-2"
          actions={
            <div className="flex gap-2 text-sm">
              <Link className="btn-ghost btn-sm" href={`?ano=${year - 1}`}>
                ← {year - 1}
              </Link>
              <Link className="btn-ghost btn-sm" href={`?ano=${year + 1}`}>
                {year + 1} →
              </Link>
            </div>
          }
        >
          {holidays.length ? (
            <table className="table">
              <caption className="sr-only">Feriados cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Dia</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id}>
                    <td className="tabular-nums">{fmtLocalDate(h.localDate)}</td>
                    <td>{WEEKDAY_LABEL[weekday(h.localDate)]}</td>
                    <td>{h.name}</td>
                    <td className="text-right">
                      <ConfirmAction
                        action={removeHolidayAction.bind(null, h.id)}
                        label="Remover"
                        className="btn-ghost btn-sm text-red-700"
                        confirm={`Remover o feriado de ${fmtLocalDate(h.localDate)}?`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={`Nenhum feriado cadastrado para ${year}`} description="Use a sugestão de feriados nacionais ou cadastre manualmente." />
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Incluir feriados nacionais">
            <ActionForm action={importHolidaysAction} className="space-y-3">
              <input type="hidden" name="year" value={year} />
              <p className="text-sm text-slate-600">Inclui os feriados nacionais de {year} que ainda não estão cadastrados.</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="includeOptional" /> Incluir Carnaval e Corpus Christi (pontos facultativos)
              </label>
              <SubmitButton className="btn-secondary">Incluir feriados de {year}</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Cadastrar feriado">
            <ActionForm action={addHolidayAction} className="space-y-3" resetOnSuccess>
              <Field label="Data" name="date" required>
                <input id="date" type="date" name="date" required className="input" />
              </Field>
              <Field label="Descrição" name="name" required>
                <input id="name" name="name" required className="input" placeholder="Ex.: Aniversário da cidade" />
              </Field>
              <SubmitButton>Cadastrar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
