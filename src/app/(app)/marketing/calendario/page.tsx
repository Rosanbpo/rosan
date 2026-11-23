import Link from "next/link";
import { Film, LayoutGrid } from "lucide-react";
import { CalendarButtons } from "@/components/marketing-approve";
import { ItemActions } from "@/components/marketing-item-actions";
import { parseSlides } from "@/domain/marketing";
import { MarketingHero } from "@/components/marketing-hero";
import { MarketingTabs } from "@/components/marketing-tabs";
import { PILLAR_LABEL, POST_STATUS_LABEL, type Pillar, type PostStatus } from "@/domain/marketing";
import { cx } from "@/lib/ui";
import { requireActor } from "@/server/context";
import { listCalendar } from "@/server/services/marketing";

export const metadata = { title: "Calendário · Marketing" };

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PILLAR_TONE: Record<Pillar, string> = {
  EDUCATIVO: "bg-sky-50 text-sky-800",
  MITOS: "bg-amber-50 text-amber-800",
  BASTIDORES: "bg-violet-50 text-violet-800",
  AUTORIDADE: "bg-emerald-50 text-emerald-800",
};
function weekKey(d: Date) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function CalendarPage() {
  const actor = await requireActor();
  const items = await listCalendar(actor);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const weeks = new Map<string, typeof items>();
  for (const i of items) {
    const k = weekKey(i.publishOn as Date);
    weeks.set(k, [...(weeks.get(k) ?? []), i]);
  }
  return (
    <>
      <MarketingHero actor={actor} />
      <MarketingTabs active="calendario" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">3 carrosséis e 2 reels por semana. Aprove cada item, ou tudo de uma vez, e eu produzo as artes.</p>
        <CalendarButtons empty={items.length === 0} />
      </div>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-600">O calendário ainda não foi carregado. Clique em <strong>Carregar calendário</strong> para ver os 23 conteúdos de 24/11 a 24/12.</div>
      ) : (
        <div className="space-y-6">
          {[...weeks.entries()].map(([k, list], n) => {
            const end = new Date(Date.parse(`${k}T12:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
            return (
              <section key={k} aria-label={`Semana ${n + 1}`}>
                <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-semibold text-brand-900">
                  Semana {n + 1} <span className="text-xs font-normal text-slate-500">{dm(k)} a {dm(end)}</span>
                </h2>
                <ul className="space-y-2">
                  {list.map((i) => {
                    const iso = (i.publishOn as Date).toISOString().slice(0, 10);
                    const isToday = iso === today;
                    const past = iso < today;
                    const reel = i.format === "REEL";
                    return (
                      <li key={i.id} className={cx("card flex flex-wrap items-center gap-4 p-3 pr-4", isToday && "ring-2 ring-[#B8935A]", past && "opacity-70")}>
                        <div className={cx("flex h-14 w-[72px] shrink-0 flex-col items-center justify-center rounded-xl", isToday ? "bg-[#F0D5AA] text-brand-900" : "bg-brand-900 text-white")}>
                          <span className="text-lg font-semibold leading-none">{iso.slice(8, 10)}</span>
                          <span className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-wide opacity-80">{WEEKDAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]} · {MONTH[Number(iso.slice(5, 7)) - 1]}</span>
                        </div>
                        <div className="min-w-[220px] flex-1">
                          <Link href={`/marketing/${i.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700">
                            {i.title}
                          </Link>
                          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", reel ? "bg-violet-50 text-violet-800" : "bg-sky-50 text-sky-800")}>
                              {reel ? <Film aria-hidden className="h-3 w-3" /> : <LayoutGrid aria-hidden className="h-3 w-3" />} {reel ? "Reel" : "Carrossel"}
                            </span>
                            <span className={cx("rounded-full px-2 py-0.5 font-medium", PILLAR_TONE[i.pillar as Pillar])}>{PILLAR_LABEL[i.pillar as Pillar]}</span>
                            <span className="text-slate-500">{POST_STATUS_LABEL[i.status as PostStatus]}</span>
                            {isToday && <span className="font-semibold text-[#8E744F]">Hoje</span>}
                          </p>
                        </div>
                        <div className="w-full basis-full pl-[88px]">
                          <ItemActions
                            id={i.id}
                            format={i.format}
                            approved={i.approved}
                            swapRequested={i.swapRequested}
                            swapReason={i.swapReason}
                            publishTime={i.publishTime}
                            scheduled={i.scheduled}
                            published={i.status === "PUBLICADO"}
                            slideCount={parseSlides(i.slidesText).length}
                            copy={[i.caption, i.hashtags].filter(Boolean).join("\n\n")}
                            dateLabel={`${iso.slice(8, 10)}/${iso.slice(5, 7)} (${WEEKDAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]})`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-5 text-xs text-slate-500">Sem publicação em 25/12 (Natal): só um story de felicitação.</p>
    </>
  );
}
