import { PageHeader } from "@/components/ui/layout";
import { SettingsNav } from "@/components/settings-nav";
import { saveChecklistAction } from "@/app/actions/gestao";
import { requirePermission } from "@/server/context";
import { getChecklistLines } from "@/server/services/checklists";

export const metadata = { title: "Checklists" };

export default async function ChecklistsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("org.settings");
  const sp = await searchParams;
  const closing = await getChecklistLines(actor.organizationId, "CLOSING");
  return (
    <>
      <PageHeader title="Configurações" description="Checklist padrão do fechamento mensal. O onboarding agora fica na jornada (Estrutura Rosan)." />
      <SettingsNav current="/configuracoes/checklists" />
      {sp.ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Checklist salvo. Vale para os próximos fechamentos.</p>}
      {sp.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
      <div className="max-w-2xl">
        <form action={saveChecklistAction.bind(null, "CLOSING")} className="card space-y-3 p-5">
          <h2 className="text-[15px] font-semibold text-brand-900">📅 Fechamento mensal</h2>
          <p className="text-sm text-slate-600">Um item por linha. Fechamentos já iniciados não mudam.</p>
          <textarea name="items" rows={10} defaultValue={closing.join("\n")} className="input" />
          <button type="submit" className="btn-primary">Salvar fechamento</button>
        </form>
      </div>
    </>
  );
}
