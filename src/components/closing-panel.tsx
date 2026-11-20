import Link from "next/link";
import { addClosingItemAction, removeClosingItemAction, startClosingAction, toggleClosingItemAction } from "@/app/actions/closings";
import { closingProgress, shiftMonth } from "@/domain/closing";
import { Card, Stat } from "@/components/ui/layout";

type Item = { id: string; label: string; doneAt: Date | null; doneBy: { name: string } | null };
type Closing = { id: string; closedAt: Date | null; items: Item[] } | null;

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function monthLabel(m: string) {
  const [y, mm] = m.split("-").map(Number) as [number, number];
  const n = MONTHS[mm - 1]!;
  return `${n[0]!.toUpperCase()}${n.slice(1)} de ${y}`;
}

export function ClosingPanel({
  clientId, month, closing, tasks, history, manage,
}: {
  clientId: string; month: string; closing: Closing; tasks: { done: number; open: number };
  history: { competence: string; closedAt: Date | null; done: number; total: number }[]; manage: boolean;
}) {
  const href = (m: string) => `/clientes/${clientId}?aba=fechamentos&mes=${m}`;
  const prog = closing ? closingProgress(closing.items) : null;
  const pending = closing?.items.filter((i) => !i.doneAt) ?? [];
  const done = closing?.items.filter((i) => i.doneAt) ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href={href(shiftMonth(month, -1))} className="btn-secondary btn-sm">←</Link>
        <h2 className="min-w-48 text-center text-base font-semibold text-brand-900">{monthLabel(month)}</h2>
        <Link href={href(shiftMonth(month, 1))} className="btn-secondary btn-sm">→</Link>
        {closing?.closedAt && <span className="ml-2 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">✅ Mês fechado</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Fechamento" value={prog ? `${prog.pct}%` : "—"} hint={prog ? `${prog.done} de ${prog.total} itens` : "não iniciado"} tone="info" />
        <Stat label="Falta fazer" value={String(pending.length)} hint="itens do checklist" tone={pending.length ? "warning" : "default"} />
        <Stat label="Tarefas feitas" value={String(tasks.done)} hint="vencem neste mês" tone="info" />
        <Stat label="Tarefas abertas" value={String(tasks.open)} hint="vencem neste mês" tone={tasks.open ? "warning" : "default"} />
      </div>

      {!closing ? (
        <Card title="Fechamento mensal">
          <p className="text-sm text-slate-600">Ainda não há checklist de fechamento para {monthLabel(month)}.</p>
          {manage && (
            <form action={startClosingAction.bind(null, clientId, month)} className="mt-3">
              <button type="submit" className="btn-primary">📋 Iniciar fechamento</button>
            </form>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={`🕒 O que falta (${pending.length})`}>
            {pending.length ? (
              <ul className="divide-y divide-hair text-sm">
                {pending.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                    <form action={toggleClosingItemAction.bind(null, i.id, true)} className="flex items-center gap-2">
                      <button type="submit" aria-label="Marcar como feito" className="h-5 w-5 rounded border border-slate-300 hover:border-emerald-500" />
                      <span>{i.label}</span>
                    </form>
                    {manage && (
                      <form action={removeClosingItemAction.bind(null, i.id)}>
                        <button type="submit" className="text-xs text-slate-400 hover:text-red-600">remover</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700">🎉 Tudo feito neste mês.</p>
            )}
            <form action={addClosingItemAction.bind(null, closing.id)} className="mt-3 flex gap-2">
              <input name="label" required maxLength={200} placeholder="Novo item do fechamento" className="input flex-1" />
              <button type="submit" className="btn-secondary">Adicionar</button>
            </form>
          </Card>
          <Card title={`✅ O que já foi feito (${done.length})`}>
            {done.length ? (
              <ul className="divide-y divide-hair text-sm">
                {done.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                    <form action={toggleClosingItemAction.bind(null, i.id, false)} className="flex items-center gap-2">
                      <button type="submit" aria-label="Desmarcar" className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-xs text-white">✓</button>
                      <span className="text-slate-500 line-through">{i.label}</span>
                    </form>
                    <span className="text-xs text-slate-400">{i.doneBy?.name}{i.doneAt ? ` · ${i.doneAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nada concluído ainda.</p>
            )}
          </Card>
        </div>
      )}

      {history.length > 0 && (
        <Card title="Meses anteriores">
          <ul className="divide-y divide-hair text-sm">
            {history.map((h) => (
              <li key={h.competence} className="flex items-center justify-between py-2">
                <Link href={href(h.competence)} className="text-brand-700 hover:underline">{monthLabel(h.competence)}</Link>
                <span className="text-slate-500">{h.closedAt ? "✅ fechado" : `${h.done}/${h.total} itens`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
