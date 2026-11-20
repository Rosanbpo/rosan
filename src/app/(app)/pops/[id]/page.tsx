import Link from "next/link";
import { Pencil } from "lucide-react";
import { CATEGORY_LABEL, PROCEDURE_STATUS_LABEL, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { fmtDate, fmtLocalDate } from "@/lib/format";
import { PopDocument } from "@/components/pop-document";
import { PopMindMap } from "@/components/pop-mindmap";
import { normalizePop, parsePop } from "@/domain/pop-markup";
import { POP_COVER, POP_EMOJI, slugify } from "@/domain/pop-style";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProcedure } from "@/server/services/procedures";

export const metadata = { title: "POP" };

export default async function ProcedurePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const { vista } = await searchParams;
  const mapa = vista === "mapa";
  const proc = await orNotFound(getProcedure(actor, id));
  const manage = can(actor, "procedures.manage");
  const content = normalizePop(proc.content);
  const cat = proc.category as TaskCategory;
  const toc = parsePop(content).flatMap((b) => (b.type === "heading" && b.level === 2 ? [b.text] : []));
  const props: Array<[string, React.ReactNode]> = [
    ["Área", CATEGORY_LABEL[cat]],
    ["Situação", PROCEDURE_STATUS_LABEL[proc.status as ProcedureStatus]],
    ["Quem executa", proc.responsible ?? "—"],
    ["Ferramentas", proc.tools ?? "—"],
    ["Responsável", proc.owner?.name ?? "—"],
    ["Última revisão", proc.reviewedAtLocal ? fmtLocalDate(proc.reviewedAtLocal) : "—"],
    ["Versão", String(proc.version)],
    ["Atualizado", fmtDate(proc.updatedAt)],
  ];

  const back = proc.client ? { href: `/clientes/${proc.client.id}?aba=pops`, label: `POPs de ${proc.client.tradeName}` } : { href: "/pops", label: "Processos e POPs" };
  return (
    <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8">
      <div className={`h-40 bg-gradient-to-r ${POP_COVER[cat]}`} aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 max-w-3xl">
          <div className="-mt-9 text-6xl leading-none" aria-hidden>{POP_EMOJI[cat]}</div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Link href={back.href} className="text-sm text-slate-500 hover:text-brand-700 hover:underline">← {back.label}</Link>
            {manage && (
              <Link href={`/pops/${id}/editar`} className="btn-secondary btn-sm">
                <Pencil aria-hidden className="h-3.5 w-3.5" /> Editar
              </Link>
            )}
          </div>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">{proc.title}</h1>
          <dl className="mt-5 grid gap-x-6 gap-y-1.5 border-b border-slate-200 pb-5 text-sm sm:grid-cols-[9rem_1fr]">
            {props.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
            <dt className="text-slate-500">Rotinas</dt>
            <dd>
              {proc.templates.length ? proc.templates.map((t, i) => (
                <span key={t.id}>{i > 0 && ", "}<Link className="text-brand-700 hover:underline" href={`/rotinas/modelos/${t.id}`}>{t.name}</Link></span>
              )) : "—"}
            </dd>
          </dl>
          {proc.objective && !toc.includes("Objetivo") && (
            <div className="mt-6 flex gap-3 rounded-md bg-sky-50 px-4 py-3.5 text-[15px] leading-7 text-sky-950">
              <span aria-hidden className="text-xl leading-7">🎯</span>
              <p><strong className="font-semibold">Objetivo: </strong>{proc.objective}</p>
            </div>
          )}
          <div className="mt-6 flex gap-1" role="tablist" aria-label="Forma de ver o processo">
            <Link role="tab" aria-selected={!mapa} href={`/pops/${id}`} className={mapa ? "btn-ghost px-3 py-1 text-xs" : "btn-secondary px-3 py-1 text-xs"}>📄 Documento</Link>
            <Link role="tab" aria-selected={mapa} href={`/pops/${id}?vista=mapa`} className={mapa ? "btn-secondary px-3 py-1 text-xs" : "btn-ghost px-3 py-1 text-xs"}>🧠 Mapa mental</Link>
          </div>
          <div className="mt-6">{mapa ? <PopMindMap title={proc.title} content={content} /> : <PopDocument content={content} />}</div>
        </article>
        {!mapa && toc.length > 1 && (
          <nav aria-label="Neste documento" className="sticky top-6 hidden self-start text-sm lg:block">
            <p className="mb-2 text-xs font-medium text-slate-500">Neste documento</p>
            <ul className="space-y-1.5 border-l border-slate-200">
              {toc.map((t) => (
                <li key={t}><a href={`#${slugify(t)}`} className="-ml-px block border-l border-transparent pl-3 text-slate-600 hover:border-brand-700 hover:text-brand-700">{t}</a></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
