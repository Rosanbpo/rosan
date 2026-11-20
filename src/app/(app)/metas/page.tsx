import { PageHeader } from "@/components/ui/layout";
import { saveGoalsAction } from "@/app/actions/metas";
import { can } from "@/domain/permissions";
import { fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { goalsOverview } from "@/server/services/goals";

export const metadata = { title: "Metas" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const goals = await goalsOverview(actor);
  const edit = can(actor, "org.settings");
  const show = (key: string, v: number | null) => (v === null ? "—" : key === "MRR" ? fmtMoney(v) : key === "UTILIZACAO" ? `${v}%` : String(v));
  return (
    <>
      <PageHeader title="Metas da empresa" description="Defina onde quer chegar e acompanhe o quanto já avançou." />
      {sp.ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Metas salvas.</p>}
      {sp.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
      <form action={saveGoalsAction} className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const pct = g.target && g.current !== null && g.target > 0 ? Math.max(0, Math.min(100, Math.round((g.current / g.target) * 100))) : null;
          return (
            <section key={g.key} className="card p-5">
              <h2 className="text-[15px] font-semibold text-brand-900">{g.emoji} {g.label}</h2>
              <p className="mt-2 text-3xl font-bold text-brand-900">{show(g.key, g.current)}</p>
              <p className="text-xs text-slate-500">agora{g.target !== null ? ` · meta ${show(g.key, g.target)}` : ""}</p>
              {pct !== null && <div className="mt-3"><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs text-slate-500">{pct}% da meta</p></div>}
              {edit && <label className="mt-3 block text-sm"><span className="font-medium text-slate-700">Meta</span><input name={g.key} inputMode="decimal" defaultValue={g.target ?? ""} className="input mt-1" placeholder="Sem meta" /></label>}
            </section>
          );
        })}
        {edit && <div className="md:col-span-2"><button type="submit" className="btn-primary">Salvar metas</button></div>}
      </form>
    </>
  );
}
