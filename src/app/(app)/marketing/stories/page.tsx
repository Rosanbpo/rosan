import { MarketingTabs } from "@/components/marketing-tabs";
import { PageHeader } from "@/components/ui/layout";
import { STORIES_RULES, STORIES_WEEK } from "@/domain/marketing-plan";

export const metadata = { title: "Stories · Marketing" };

export default function StoriesPage() {
  return (
    <>
      <PageHeader title="Marketing" description="O que postar nos stories todos os dias. Os stories são a maior parte das suas visualizações, então a rotina importa." />
      <MarketingTabs active="stories" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="px-4 py-2">Dia</th>
              <th className="px-4 py-2">Assunto</th>
              <th className="px-4 py-2">Formato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {STORIES_WEEK.map((r) => (
              <tr key={r.day}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{r.day}</td>
                <td className="px-4 py-2.5 text-slate-800">{r.topic}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
