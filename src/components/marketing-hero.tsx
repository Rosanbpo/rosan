import { Camera, CalendarCheck, Film, LayoutGrid } from "lucide-react";
import { listCalendar } from "@/server/services/marketing";
import type { Actor } from "@/domain/permissions";

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function brToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
}
function when(dateIso: string, today: string) {
  const diff = Math.round((Date.parse(`${dateIso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  const d = new Date(`${dateIso}T12:00:00Z`);
  return `${WEEKDAY[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Faixa azul-marinho no topo do Marketing: próximo post e andamento do plano. */
export async function MarketingHero({ actor }: { actor: Actor }) {
  const items = await listCalendar(actor);
  const today = brToday();
  const next = items.find((i) => i.status !== "PUBLICADO" && (i.publishOn as Date).toISOString().slice(0, 10) >= today);
  const approved = items.filter((i) => i.approved).length;
  const published = items.filter((i) => i.status === "PUBLICADO").length;
  const Icon = next?.format === "REEL" ? Film : LayoutGrid;
  return (
    <section aria-label="Resumo do Instagram" className="relative mb-5 overflow-hidden rounded-2xl bg-brand-900 p-6 text-white shadow-sm">
      <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#F0D5AA]/10" />
      <div aria-hidden className="absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[#F0D5AA]/5" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-[260px]">
          <p className="flex items-center gap-2 text-sm font-medium text-[#F0D5AA]">
            <Camera aria-hidden className="h-4 w-4" /> @rosanfinancas
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Marketing</h1>
          {next ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-100">
              <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#F0D5AA]" />
              <span>
                Próximo post: <strong className="font-semibold text-white">{when((next.publishOn as Date).toISOString().slice(0, 10), today)}</strong>, {next.format === "REEL" ? "reel" : "carrossel"} “{next.title}”
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-200">Carregue o calendário para ver o plano de posts.</p>
          )}
        </div>
        <dl className="flex gap-3">
          {[
            [items.length, "no calendário"],
            [approved, "aprovados"],
            [published, "publicados"],
          ].map(([n, l]) => (
            <div key={l} className="min-w-[92px] rounded-xl bg-white/10 px-4 py-3 text-center">
              <dt className="sr-only">{l}</dt>
              <dd className="text-2xl font-semibold text-[#F0D5AA]">{n}</dd>
              <dd className="text-xs text-slate-200">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
      {approved === 0 && items.length > 0 && (
        <p className="relative mt-4 flex items-center gap-2 text-xs text-slate-200">
          <CalendarCheck aria-hidden className="h-4 w-4 text-[#F0D5AA]" /> Aprove os conteúdos na aba Calendário para eu começar a produzir as artes.
        </p>
      )}
    </section>
  );
}
