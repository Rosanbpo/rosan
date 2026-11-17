import Link from "next/link";
import { Pencil } from "lucide-react";
import { CATEGORY_LABEL, PROCEDURE_STATUS_LABEL, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Card, PageHeader } from "@/components/ui/layout";
import { fmtDate, fmtLocalDate } from "@/lib/format";
import { PopDocument } from "@/components/pop-document";
import { PopMindMap } from "@/components/pop-mindmap";
import { normalizePop } from "@/domain/pop-markup";
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

  return (
    <>
      <PageHeader
        breadcrumb={proc.client ? { href: `/clientes/${proc.client.id}?aba=pops`, label: `POPs de ${proc.client.tradeName}` } : { href: "/pops", label: "Processos e POPs" }}
        title={proc.title}
        description={`${proc.client ? `${proc.client.tradeName} · ` : ""}${CATEGORY_LABEL[proc.category as TaskCategory]} · versão ${proc.version} · ${PROCEDURE_STATUS_LABEL[proc.status as ProcedureStatus]}`}
        actions={
          manage && (
            <Link href={`/pops/${id}/editar`} className="btn-secondary">
              <Pencil aria-hidden className="h-4 w-4" /> Editar
            </Link>
          )
        }
      />
      <div className={mapa ? "grid gap-6" : "grid gap-6 lg:grid-cols-3"}>
        <div className={mapa ? "space-y-6" : "space-y-6 lg:col-span-2"}>
          {proc.objective && (
            <Card title="Objetivo">
              <p className="text-sm text-slate-700">{proc.objective}</p>
            </Card>
          )}
          <div className="flex gap-1" role="tablist" aria-label="Forma de ver o processo">
            <Link role="tab" aria-selected={!mapa} href={`/pops/${id}`} className={mapa ? "btn-secondary px-3 py-1 text-xs" : "btn-primary px-3 py-1 text-xs"}>
              Documento
            </Link>
            <Link role="tab" aria-selected={mapa} href={`/pops/${id}?vista=mapa`} className={mapa ? "btn-primary px-3 py-1 text-xs" : "btn-secondary px-3 py-1 text-xs"}>
              Mapa mental
            </Link>
          </div>
          {mapa ? (
            <PopMindMap title={proc.title} content={content} />
          ) : (
            <div className="card p-6">
              <PopDocument content={content} />
            </div>
          )}
        </div>
        <Card title="Ficha do processo">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Quem executa</dt>
              <dd>{proc.responsible ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ferramentas</dt>
              <dd>{proc.tools ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Responsável pelo POP</dt>
              <dd>{proc.owner?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Última revisão</dt>
              <dd>{proc.reviewedAtLocal ? fmtLocalDate(proc.reviewedAtLocal) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Rotinas que usam este POP</dt>
              <dd>
                {proc.templates.length ? (
                  <ul className="space-y-0.5">
                    {proc.templates.map((t) => (
                      <li key={t.id}>
                        <Link className="text-brand-700 hover:underline" href={`/rotinas/modelos/${t.id}`}>
                          {t.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Atualizado em</dt>
              <dd>{fmtDate(proc.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
