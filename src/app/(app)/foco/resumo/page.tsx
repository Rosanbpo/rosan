import Link from "next/link";
import { PageHeader } from "@/components/ui/layout";
import { requireActor } from "@/server/context";
import { focusStats } from "@/server/services/focus";

export const metadata = { title: "Resumo do foco" };

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-brand-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Bars({ items, unit }: { items: { name: string; min: number; href?: string }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.min));
  if (!items.length) return <p className="text-sm text-slate-500">Sem focos nos últimos 30 dias.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.name}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{i.href ? <Link href={i.href} className="hover:underline">{i.name}</Link> : i.name}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{hm(i.min)}{unit}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold" style={{ width: `${(i.min / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function ResumoFoco() {
  const actor = await requireActor();
  const s = await focusStats(actor);
  const maxDay = Math.max(30, ...s.days.map((d) => d.min));
  const maxHour = Math.max(1, ...s.hours);
  const best = s.hours.indexOf(Math.max(...s.hours));
  return (
    <>
      <PageHeader title="Resumo do foco" description="Quanto você focou, quando rende mais e onde o tempo foi." actions={<Link href="/foco" className="btn-primary">Começar foco</Link>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Hoje" value={hm(s.today.min)} hint={`${s.today.n} foco${s.today.n === 1 ? "" : "s"} completo${s.today.n === 1 ? "" : "s"}`} />
        <Tile label="Últimos 7 dias" value={hm(s.week.min)} hint={`${s.week.n} focos`} />
        <Tile label="Últimos 30 dias" value={hm(s.month.min)} hint={`${s.month.n} focos · ${s.month.rate}% concluídos`} />
        <Tile label="Sequência" value={`${s.streak} dia${s.streak === 1 ? "" : "s"}`} hint="dias seguidos com foco completo" />
      </div>

      <section className="card mb-4 p-4" aria-label="Minutos por dia">
        <h2 className="mb-3 text-sm font-semibold text-brand-900">Minutos focados por dia (14 dias)</h2>
        <div className="flex h-40 items-end gap-1.5">
          {s.days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.min} min, ${d.n} focos`}>
              <span className="text-[10px] tabular-nums text-slate-500">{d.min || ""}</span>
              <div className={`w-full rounded-t ${d.min ? "bg-gold" : "bg-slate-100"}`} style={{ height: `${Math.max(d.min ? 4 : 2, (d.min / maxDay) * 100)}%` }} />
              <span className="text-[10px] text-slate-500">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Por cliente (30 dias)</h2>
          <Bars items={s.byClient.map((c) => ({ name: c.name, min: c.min, href: `/clientes/${c.id}` }))} />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Tarefas que mais tomaram foco</h2>
          <Bars items={s.byTask.map((c) => ({ name: c.name, min: c.min, href: `/tarefas/${c.id}` }))} />
        </section>
      </div>

      <section className="card mt-4 p-4" aria-label="Horários">
        <h2 className="mb-1 text-sm font-semibold text-brand-900">Seus melhores horários</h2>
        <p className="mb-3 text-xs text-slate-500">{s.total ? `Você rende mais por volta das ${String(best).padStart(2, "0")}h. Reserve esse horário para a tarefa mais difícil.` : "Faça alguns focos para ver o seu melhor horário."}</p>
        <div className="flex h-24 items-end gap-0.5">
          {s.hours.map((m, h) => (
            <div key={h} className="flex h-full flex-1 flex-col justify-end" title={`${h}h: ${m} min`}>
              <div className={`w-full rounded-t ${m ? "bg-brand-700" : "bg-slate-100"}`} style={{ height: `${Math.max(m ? 4 : 2, (m / maxHour) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
      </section>
    </>
  );
}
