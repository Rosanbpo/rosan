import Link from "next/link";
import { ApproveToggle, CalendarButtons } from "@/components/marketing-approve";
import { MarketingTabs } from "@/components/marketing-tabs";
import { PageHeader } from "@/components/ui/layout";
import { PILLAR_LABEL, POST_STATUS_LABEL, type Pillar, type PostStatus } from "@/domain/marketing";
import { cx } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { listCalendar } from "@/server/services/marketing";

export const metadata = { title: "Calendário · Marketing" };

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const fmtDate = (d: Date) => `${WEEKDAY[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
/** Segunda-feira da semana (UTC) como chave. */
function weekKey(d: Date) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  const actor = await requireActor();
  const items = await listCalendar(actor);
  const weeks = new Map<string, typeof items>();
  for (const i of items) {
    const k = weekKey(i.publishOn as Date);
    weeks.set(k, [...(weeks.get(k) ?? []), i]);
  }
  const approved = items.filter((i) => i.approved).length;
  return (
    <>
      <PageHeader title="Marketing" description="Plano de conteúdo do Instagram: 3 carrosséis e 2 reels por semana. Aprove cada item (ou tudo de uma vez) e eu produzo as artes." actions={<CalendarButtons empty={items.length === 0} />} />
      <MarketingTabs active="calendario" />
      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">O calendário ainda não foi carregado. Clique em <strong>Carregar calendário</strong> para ver os 19 conteúdos de 30/11 a 24/12.</div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-700">
            <strong>{approved}</strong> de {items.length} aprovados.
          </p>
          <div className="space-y-5">
            {[...weeks.entries()].map(([k, list], n) => (
              <section key={k} aria-label={`Semana ${n + 1}`} className="card overflow-hidden">
                <h2 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-brand-900">Semana {n + 1}</h2>
                <ul className="divide-y divide-slate-100">
                  {list.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="w-20 shrink-0 text-sm font-medium text-slate-800">{fmtDate(i.publishOn as Date)}</span>
                      <span className={cx("w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold", i.format === "REEL" ? "bg-violet-50 text-violet-800" : "bg-sky-50 text-sky-800")}>{i.format === "REEL" ? "Reel" : "Carrossel"}</span>
                      <Link href={`/marketing/${i.id}`} className="min-w-[220px] flex-1 text-sm font-medium text-slate-900 hover:text-brand-700">
                        {i.title}
                      </Link>
                      <span className="text-xs text-slate-600">{PILLAR_LABEL[i.pillar as Pillar]}</span>
                      <span className="text-xs text-slate-500">{POST_STATUS_LABEL[i.status as PostStatus]}</span>
                      <ApproveToggle id={i.id} approved={i.approved} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Sem publicação em 25/12 (Natal): só um story de felicitação.</p>
        </>
      )}
    </>
  );
}
