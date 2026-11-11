import Link from "next/link";
import { Pencil } from "lucide-react";
import { CATEGORY_LABEL, PROCEDURE_STATUS_LABEL, type ProcedureStatus, type TaskCategory } from "@/domain/enums";
import { can } from "@/domain/permissions";
import { Card, PageHeader } from "@/components/ui/layout";
import { fmtDate, fmtLocalDate } from "@/lib/format";
import { requireActor } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProcedure } from "@/server/services/procedures";

export const metadata = { title: "POP" };

/** Divide o texto em etapas (blocos separados por linha em branco), numerando as linhas de cada etapa. */
function toSteps(content: string): string[][] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length);
}

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const proc = await orNotFound(getProcedure(actor, id));
  const manage = can(actor, "procedures.manage");
  const blocks = toSteps(proc.content);
  let n = 0;

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/pops", label: "Processos e POPs" }}
        title={proc.title}
        description={`${CATEGORY_LABEL[proc.category as TaskCategory]} · versão ${proc.version} · ${PROCEDURE_STATUS_LABEL[proc.status as ProcedureStatus]}`}
        actions={
          manage && (
            <Link href={`/pops/${id}/editar`} className="btn-secondary">
              <Pencil aria-hidden className="h-4 w-4" /> Editar
            </Link>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {proc.objective && (
            <Card title="Objetivo">
              <p className="text-sm text-slate-700">{proc.objective}</p>
            </Card>
          )}
          <Card title="Passo a passo">
            <div className="space-y-4">
              {blocks.map((lines, i) => (
                <ol key={i} className="space-y-2">
                  {lines.map((line) => {
                    n += 1;
                    return (
                      <li key={n} className="flex gap-3 text-sm text-slate-800">
                        <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                          {n}
                        </span>
                        <span>{line}</span>
                      </li>
                    );
                  })}
                </ol>
              ))}
            </div>
          </Card>
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
