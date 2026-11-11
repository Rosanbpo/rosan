import Link from "next/link";
import { Plus } from "lucide-react";
import { LEAD_STAGES, LEAD_STAGE_LABEL, LEAD_STAGE_PROBABILITY, type LeadStage } from "@/domain/enums";
import { instantToLocalDate } from "@/domain/dates";
import { EmptyState, PageHeader, Stat } from "@/components/ui/layout";
import { fmtLocalDate, fmtMoney, fmtPercent } from "@/lib/format";
import { cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { str } from "@/server/page-utils";
import { listLeads } from "@/server/services/leads";

export const metadata = { title: "CRM comercial" };

type SP = Record<string, string | string[] | undefined>;

const COLUMN_TONE: Record<LeadStage, string> = {
  NOVO: "border-t-slate-400",
  CONTATO: "border-t-sky-400",
  REUNIAO: "border-t-indigo-400",
  PROPOSTA: "border-t-amber-500",
  NEGOCIACAO: "border-t-orange-500",
  GANHO: "border-t-emerald-500",
  PERDIDO: "border-t-zinc-400",
};

export default async function CrmPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("crm.manage");
  const sp = await searchParams;
  const q = str(sp, "q");
  const { leads, forecast, conversion, won, lost } = await listLeads(actor, { q });
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const showClosed = str(sp, "encerrados") === "1";
  const stages = LEAD_STAGES.filter((s) => showClosed || (s !== "GANHO" && s !== "PERDIDO"));
  const overdueActions = leads.filter((l) => l.nextActionAt && l.nextActionAt < today && l.stage !== "GANHO" && l.stage !== "PERDIDO").length;

  return (
    <>
      <PageHeader
        title="CRM comercial"
        description="Funil de novos clientes, do primeiro contato ao contrato."
        actions={
          <Link href="/crm/novo" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Novo lead
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mensalidade em aberto" value={fmtMoney(forecast.openFee)} hint="Soma dos leads em andamento" />
        <Stat label="Previsão ponderada" value={fmtMoney(forecast.weightedFee)} hint="Valor × chance por etapa" tone="info" />
        <Stat label="Conversão" value={fmtPercent(conversion)} hint={`${won} ganho(s) · ${lost} perdido(s)`} tone="success" />
        <Stat label="Ações atrasadas" value={overdueActions} tone={overdueActions ? "danger" : "default"} hint="Próximas ações com data vencida" />
      </div>

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" aria-label="Filtros do CRM">
        <div className="min-w-60 flex-1">
          <label htmlFor="f-q" className="label text-xs">
            Pesquisa
          </label>
          <input id="f-q" name="q" className="input" defaultValue={q} placeholder="Empresa ou contato" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="encerrados" value="1" defaultChecked={showClosed} /> Mostrar ganhos e perdidos
        </label>
        <button className="btn-primary" type="submit">
          Filtrar
        </button>
        <Link href="/crm" className="btn-secondary">
          Limpar
        </Link>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title="Nenhum lead ainda"
          description="Cadastre o primeiro contato comercial para acompanhar o funil."
          action={<Link href="/crm/novo" className="btn-primary">Cadastrar lead</Link>}
        />
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(15rem, 1fr))` }}>
          {stages.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const total = items.reduce((a, l) => a + (l.expectedFee ?? 0), 0);
            return (
              <section key={stage} aria-label={LEAD_STAGE_LABEL[stage]} className={cx("rounded-lg border border-t-4 border-slate-200 bg-slate-100/60", COLUMN_TONE[stage])}>
                <header className="px-3 py-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {LEAD_STAGE_LABEL[stage]} <span className="font-normal text-slate-500">({items.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {fmtMoney(total)}
                    {stage !== "GANHO" && stage !== "PERDIDO" && ` · chance ${Math.round(LEAD_STAGE_PROBABILITY[stage] * 100)}%`}
                  </p>
                </header>
                <ul className="space-y-2 p-2">
                  {items.map((l) => {
                    const late = l.nextActionAt && l.nextActionAt < today && stage !== "GANHO" && stage !== "PERDIDO";
                    return (
                      <li key={l.id}>
                        <Link href={`/crm/${l.id}`} className="card block p-3 hover:shadow-md">
                          <p className="text-sm font-medium text-slate-900">{l.companyName}</p>
                          {l.contactName && <p className="text-xs text-slate-500">{l.contactName}</p>}
                          <p className="mt-1 text-sm tabular-nums text-slate-700">{fmtMoney(l.expectedFee)}</p>
                          {l.nextAction && (
                            <p className={cx("mt-1 text-xs", late ? "font-semibold text-red-700" : "text-slate-600")}>
                              {l.nextAction}
                              {l.nextActionAt && ` · ${fmtLocalDate(l.nextActionAt)}`}
                            </p>
                          )}
                          {l.ownerName && <p className="mt-1 text-xs text-slate-400">{l.ownerName}</p>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
