import Link from "next/link";
import { LEAD_STAGE_LABEL } from "@/domain/enums";
import { PageHeader } from "@/components/ui/layout";
import { fmtMoney } from "@/lib/format";
import { cx } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { commercialSummary } from "@/server/services/commercial";

export const metadata = { title: "Painel comercial" };

const STAGE_EMOJI: Record<string, string> = { NOVO: "🆕", CONTATO: "📞", REUNIAO: "🤝", PROPOSTA: "📄", NEGOCIACAO: "💬", GANHO: "🏆", PERDIDO: "❌" };

function Num({ value, label, tone = "text-brand-900", href }: { value: number | string; label: string; tone?: string; href?: string }) {
  const body = (
    <div className="rounded-xl border border-hair bg-white px-3 py-2.5 text-center transition hover:border-brand-300">
      <div className={cx("text-2xl font-bold tabular-nums", tone)}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Block({ emoji, title, href, linkLabel, tint, children }: { emoji: string; title: string; href: string; linkLabel: string; tint: string; children: React.ReactNode }) {
  return (
    <section className={cx("rounded-2xl border p-4", tint)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-900">{emoji} {title}</h2>
        <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">{linkLabel}</Link>
      </div>
      {children}
    </section>
  );
}

export default async function ComercialPage() {
  const actor = await requirePermission("crm.manage");
  const s = await commercialSummary(actor);
  const { leads, diagnoses: dx, proposals: pr, contracts: ct } = s;
  const maxStage = Math.max(1, ...leads.stages.map((x) => x.count));

  return (
    <>
      <PageHeader title="Painel comercial" description="Tudo da parte comercial num lugar só: leads, diagnósticos, propostas e contratos." />

      {/* Jornada: do lead ao contrato */}
      <div className="mb-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {[
          { e: "🎯", l: "Leads em andamento", v: leads.open, h: `${leads.month} novos no mês` },
          { e: "📝", l: "Diagnósticos respondidos", v: dx.answered, h: `${dx.waiting.length} aguardando` },
          { e: "📄", l: "Propostas aceitas", v: pr.accepted, h: `${pr.waiting} aguardando aceite` },
          { e: "✍️", l: "Contratos assinados", v: ct.signed, h: `${ct.awaiting} aguardando assinatura` },
        ].map((j, i) => (
          <div key={j.l} className="relative rounded-2xl border border-brand-100 bg-brand-50/60 px-3 py-3">
            <div className="text-xs font-medium text-brand-800">{j.e} {j.l}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-brand-900">{j.v}</div>
            <div className="text-xs text-slate-500">{j.h}</div>
            {i < 3 && <span className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-brand-400 sm:block">➜</span>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block emoji="🎯" title="Leads e funil" href="/crm" linkLabel="Abrir CRM" tint="border-sky-200 bg-sky-50/40">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Num value={leads.open} label="em andamento" />
            <Num value={leads.month} label="novos no mês" tone="text-sky-700" />
            <Num value={leads.wonMonth} label="ganhos no mês" tone="text-emerald-700" />
          </div>
          <ul className="space-y-1.5">
            {leads.stages.map((st) => (
              <li key={st.stage} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 text-slate-700">{STAGE_EMOJI[st.stage]} {LEAD_STAGE_LABEL[st.stage]}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                  <span className={cx("block h-full rounded-full", st.stage === "GANHO" ? "bg-emerald-500" : st.stage === "PERDIDO" ? "bg-zinc-400" : "bg-brand-500")} style={{ width: `${(st.count / maxStage) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-semibold tabular-nums text-brand-900">{st.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Valor previsto em andamento: <b className="text-brand-900">{fmtMoney(leads.openFee)}</b>/mês</p>
        </Block>

        <Block emoji="📝" title="Diagnósticos" href="/clientes" linkLabel="Ver clientes" tint="border-violet-200 bg-violet-50/40">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Num value={dx.sent} label="enviados" />
            <Num value={dx.answered} label="respondidos" tone="text-emerald-700" />
            <Num value={dx.waiting.length} label="aguardando resposta" tone="text-amber-700" />
          </div>
          {dx.unseen > 0 && <p className="mb-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800">🎉 {dx.unseen} resposta{dx.unseen > 1 ? "s" : ""} nova{dx.unseen > 1 ? "s" : ""} para você ver</p>}
          {dx.waiting.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum diagnóstico esperando resposta.</p>
          ) : (
            <ul className="divide-y divide-white rounded-xl bg-white text-sm">
              {dx.waiting.slice(0, 6).map((w) => (
                <li key={w.clientId}>
                  <Link href={`/clientes/${w.clientId}?aba=onboarding`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-brand-50">
                    <span className="truncate font-medium text-brand-900">{w.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{w.since ? `enviado em ${w.since.toLocaleDateString("pt-BR")}` : "enviado"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block emoji="📄" title="Propostas" href="/propostas" linkLabel="Abrir propostas" tint="border-amber-200 bg-amber-50/40">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Num value={pr.sent} label="enviadas" href="/propostas" />
            <Num value={pr.waiting} label="aguardando aceite" tone="text-amber-700" href="/propostas" />
            <Num value={pr.accepted} label="aceitas" tone="text-emerald-700" href="/propostas" />
            <Num value={pr.refused} label="recusadas" tone="text-zinc-500" href="/propostas" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Aguardando aceite: <b className="text-brand-900">{fmtMoney(pr.waitingFee)}</b>/mês · Aceitas: <b className="text-emerald-700">{fmtMoney(pr.acceptedFee)}</b>/mês
            {pr.draft > 0 && <> · {pr.draft} rascunho{pr.draft > 1 ? "s" : ""}</>}
          </p>
        </Block>

        <Block emoji="✍️" title="Contratos" href="/contratos" linkLabel="Abrir contratos" tint="border-emerald-200 bg-emerald-50/40">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Num value={ct.sent} label="enviados" href="/contratos" />
            <Num value={ct.awaiting} label="aguardando assinatura" tone="text-amber-700" href="/contratos" />
            <Num value={ct.signed} label="assinados" tone="text-emerald-700" href="/contratos" />
            <Num value={ct.expired} label="link expirado" tone="text-red-600" href="/contratos" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Aguardando assinatura: <b className="text-brand-900">{fmtMoney(ct.awaitingFee)}</b>/mês · Assinados: <b className="text-emerald-700">{fmtMoney(ct.signedFee)}</b>/mês
            {ct.notSent > 0 && <> · {ct.notSent} ainda não enviado{ct.notSent > 1 ? "s" : ""}</>}
          </p>
        </Block>
      </div>
    </>
  );
}
