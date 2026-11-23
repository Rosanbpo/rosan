import { requireActor } from "@/server/context";
import { MarketingHero } from "@/components/marketing-hero";
import { MarketingTabs } from "@/components/marketing-tabs";
import { STORIES_RULES, STORIES_WEEK } from "@/domain/marketing-plan";

export const metadata = { title: "Stories · Marketing" };

export default async function StoriesPage() {
  const actor = await requireActor();
  const todayIdx = (new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay() + 6) % 7;
  return (
    <>
      <MarketingHero actor={actor} />
      <MarketingTabs active="stories" />
      <p className="mb-4 text-sm text-slate-700">Os stories são a maior parte das suas visualizações, então a rotina diária importa.</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STORIES_WEEK.map((r, i) => (
          <li key={r.day} className={`card p-4 ${i === todayIdx ? "ring-2 ring-[#B8935A]" : ""}`}>
            <p className="flex items-center justify-between text-sm font-semibold text-brand-900">
              {r.day}
              {i === todayIdx && <span className="rounded-full bg-[#F0D5AA] px-2 py-0.5 text-xs">Hoje</span>}
            </p>
            <p className="mt-2 text-sm text-slate-900">{r.topic}</p>
            <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">{r.format}</p>
          </li>
        ))}
      </ul>
      <section className="card mt-5 p-5" aria-label="Regras fixas">
        <h2 className="mb-2 text-sm font-semibold text-brand-900">Regras fixas</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          {STORIES_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
