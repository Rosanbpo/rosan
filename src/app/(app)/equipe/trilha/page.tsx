import Link from "next/link";
import { PageHeader } from "@/components/ui/layout";
import { addTrainingItemAction, removeTrainingItemAction, toggleTrainingAction } from "@/app/actions/biblioteca";
import { can } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { trainingItems, trainingTeam } from "@/server/services/training";

export const metadata = { title: "Trilha de onboarding da equipe" };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const items = await trainingItems(actor);
  const manage = can(actor, "users.manage");
  const team = manage ? await trainingTeam(actor) : [];
  const mine = items.filter((i) => i.progress.some((p) => p.userId === actor.userId)).length;
  const pct = items.length ? Math.round((mine / items.length) * 100) : 0;
  return (
    <>
      <PageHeader title="Trilha de onboarding" description="O que cada pessoa nova precisa conhecer e fazer nas primeiras semanas." breadcrumb={{ href: "/equipe", label: "Equipe" }} />
      {sp.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
      <div className="card mb-5 p-4"><p className="text-sm font-medium text-brand-900">🎓 Seu progresso: {mine} de {items.length} ({pct}%)</p><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div></div>
      <ul className="card divide-y divide-hair">
        {items.map((i) => {
          const done = i.progress.some((p) => p.userId === actor.userId);
          return (
            <li key={i.id} className="flex items-start gap-3 px-5 py-3">
              <form action={toggleTrainingAction.bind(null, i.id, !done)}>
                <button type="submit" aria-label={done ? "Desmarcar" : "Marcar como feito"} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-500"}`}>{done ? "✓" : ""}</button>
              </form>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-brand-900"}`}>{i.title}</p>
                {i.description && <p className="text-xs text-slate-500">{i.description}</p>}
                {i.url && <Link href={i.url} className="text-xs text-brand-700 hover:underline">Abrir →</Link>}
                {manage && <p className="mt-1 text-xs text-slate-400">Concluído por: {team.filter((u) => i.progress.some((p) => p.userId === u.id)).map((u) => u.name).join(", ") || "ninguém ainda"}</p>}
              </div>
              {manage && <form action={removeTrainingItemAction.bind(null, i.id)}><button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover</button></form>}
            </li>
          );
        })}
      </ul>
      {manage && (
        <form action={addTrainingItemAction} className="card mt-5 flex flex-wrap items-end gap-3 p-4">
          <label className="min-w-60 flex-1 text-sm"><span className="font-medium text-slate-700">Novo item da trilha</span><input name="title" required className="input mt-1" /></label>
          <label className="min-w-60 flex-1 text-sm"><span className="font-medium text-slate-700">Descrição (opcional)</span><input name="description" className="input mt-1" /></label>
          <button type="submit" className="btn-primary">Adicionar</button>
        </form>
      )}
    </>
  );
}
