import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/layout";
import { can } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { requireSection } from "@/server/services/library";
import { getCulture } from "@/server/services/culture";

export const metadata = { title: "Missão, visão e valores" };

const CARD_TONES = ["bg-sky-50 border-sky-200", "bg-violet-50 border-violet-200", "bg-emerald-50 border-emerald-200", "bg-amber-50 border-amber-200", "bg-rose-50 border-rose-200", "bg-teal-50 border-teal-200"];

export default async function CulturaPage() {
  const actor = await requireActor();
  await requireSection(actor, "cultura");
  const c = await getCulture(actor);
  const canEdit = can(actor, "org.settings");
  const empty = !c.mission && !c.vision && c.values.length === 0;
  return (
    <>
      <PageHeader
        title="Missão, visão e valores"
        description="Quem somos e o que guia cada decisão da equipe."
        actions={canEdit && <Link href="/cultura/editar" className="btn-primary"><Pencil aria-hidden className="h-4 w-4" /> {empty ? "Preencher" : "Editar"}</Link>}
      />
      {empty ? (
        <div className="card py-16 text-center">
          <div className="text-5xl" aria-hidden>🧭</div>
          <p className="mt-3 font-semibold text-slate-900">Missão, visão e valores ainda não foram cadastrados</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Escreva aqui o propósito da empresa para que toda a equipe tenha acesso, em um painel bonito e fácil de ler.</p>
          {canEdit && <Link href="/cultura/editar" className="btn-primary mt-5 inline-flex">Preencher agora</Link>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-8 text-white shadow-sm">
              <span aria-hidden className="absolute -right-4 -top-6 text-[8rem] opacity-10">🎯</span>
              <p className="text-sm font-medium text-white/70">🎯 Missão</p>
              <p className="mt-3 whitespace-pre-line text-2xl font-semibold leading-snug">{c.mission || "—"}</p>
            </section>
            <section className="relative overflow-hidden rounded-2xl border border-brand-200 bg-white p-8 shadow-sm">
              <span aria-hidden className="absolute -right-4 -top-6 text-[8rem] opacity-[0.07]">🔭</span>
              <p className="text-sm font-medium text-brand-700">🔭 Visão</p>
              <p className="mt-3 whitespace-pre-line text-2xl font-semibold leading-snug text-slate-900">{c.vision || "—"}</p>
            </section>
          </div>
          {c.values.length > 0 && (
            <section aria-label="Valores">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">💎 Nossos valores</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {c.values.map((v, i) => (
                  <li key={i} className={`rounded-2xl border p-6 ${CARD_TONES[i % CARD_TONES.length]}`}>
                    <div className="text-4xl" aria-hidden>{v.emoji}</div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{v.title}</h3>
                    {v.text && <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{v.text}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
