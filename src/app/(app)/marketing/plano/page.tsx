import { CopyCaption } from "@/components/marketing-tools";
import { MarketingTabs } from "@/components/marketing-tabs";
import { MarketingHero } from "@/components/marketing-hero";
import { INSIGHTS, PROFILE } from "@/domain/marketing-plan";
import { requireActor } from "@/server/context";

export const metadata = { title: "Plano do Instagram · Marketing" };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5" aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}
const List = ({ items }: { items: readonly string[] }) => (
  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

export default async function PlanPage() {
  const actor = await requireActor();
  return (
    <>
      <MarketingHero actor={actor} />
      <MarketingTabs active="plano" />
      <ul className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {INSIGHTS.tiles.map(([n, l]) => (
          <li key={l} className="card p-4">
            <p className="text-3xl font-semibold tracking-tight text-brand-900">{n}</p>
            <p className="mt-1 text-xs text-slate-600">{l}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={`Números do perfil (${INSIGHTS.asOf})`}>
          <dl className="space-y-2 text-sm">
            {INSIGHTS.numbers.map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-x-3">
                <dt className="font-medium text-slate-900">{k}:</dt>
                <dd className="text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="O que funcionou">
          <List items={INSIGHTS.worked} />
        </Card>
        <Card title="Leitura">
          <List items={INSIGHTS.reading} />
        </Card>
        <Card title="Temas já postados (para não repetir)">
          <List items={INSIGHTS.alreadyPosted} />
        </Card>
        <Card title="Bio e nome">
          <p className="text-sm text-slate-800">
            <strong>Nome:</strong> {PROFILE.name}
          </p>
          <p className="mt-2 text-sm text-slate-800">
            <strong>Bio:</strong> {PROFILE.bio}
          </p>
          <div className="mt-3">
            <CopyCaption text={PROFILE.bio} />
          </div>
        </Card>
        <Card title="Link da bio (3 botões, nesta ordem)">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {PROFILE.links.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </Card>
        <Card title="Destaques (as capas você já tem)">
          <ul className="space-y-1.5 text-sm">
            {PROFILE.highlights.map(([n, d]) => (
              <li key={n}>
                <strong className="text-slate-900">{n}:</strong> <span className="text-slate-700">{d}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Feed">
          <p className="mb-1 text-sm font-medium text-slate-900">Posts fixados</p>
          <List items={PROFILE.pinned} />
          <p className="mt-3 text-sm text-slate-800">{PROFILE.reelCovers}</p>
        </Card>
        <Card title="Site da Rosan Finanças">
          <List items={PROFILE.site} />
        </Card>
      </div>
    </>
  );
}
