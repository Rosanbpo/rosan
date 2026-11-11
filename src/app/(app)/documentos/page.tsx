import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { instantToLocalDate } from "@/domain/dates";
import { isCompetence, previousCompetence, shiftCompetence } from "@/domain/documents";
import { fmtCompetence } from "@/lib/format";
import { requireActor } from "@/server/context";
import { APP_TIMEZONE } from "@/server/config";
import { documentsOverview } from "@/server/services/documents";

export const metadata = { title: "Documentos dos clientes" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const competence = isCompetence(sp.competencia) ? sp.competencia : previousCompetence(instantToLocalDate(new Date(), APP_TIMEZONE));
  const rows = await documentsOverview(actor, competence);
  const configured = rows.filter((r) => r.configured && r.requiredCount > 0);
  const pending = configured.filter((r) => r.receivedCount < r.requiredCount);
  const notConfigured = rows.filter((r) => !r.configured || r.requiredCount === 0);

  return (
    <>
      <PageHeader
        title="Documentos dos clientes"
        description="Acompanhe o que cada cliente já enviou na competência."
        actions={
          <div className="flex items-center gap-1">
            <Link aria-label="Mês anterior" className="icon-btn" href={`/documentos?competencia=${shiftCompetence(competence, -1)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-16 text-center text-sm font-semibold">{fmtCompetence(competence)}</span>
            <Link aria-label="Próximo mês" className="icon-btn" href={`/documentos?competencia=${shiftCompetence(competence, 1)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Nenhum cliente ativo" description="Cadastre clientes para controlar os documentos." />
      ) : (
        <div className="space-y-6">
          <Card title={`Faltam documentos (${pending.length})`}>
            {pending.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {pending.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link href={`/clientes/${r.id}?aba=documentos&competencia=${competence}`} className="font-medium hover:underline">
                        {r.tradeName}
                      </Link>
                      <p className="text-xs text-slate-500">Falta: {r.missing.join(", ")}</p>
                    </div>
                    <span className="text-xs font-medium text-amber-700">
                      {r.receivedCount}/{r.requiredCount} recebidos
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700">Todos os clientes configurados enviaram os documentos obrigatórios desta competência.</p>
            )}
          </Card>
          {configured.length > pending.length && (
            <Card title={`Completos (${configured.length - pending.length})`}>
              <ul className="flex flex-wrap gap-2 text-sm">
                {configured
                  .filter((r) => r.receivedCount === r.requiredCount)
                  .map((r) => (
                    <li key={r.id}>
                      <Link href={`/clientes/${r.id}?aba=documentos&competencia=${competence}`} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 hover:underline">
                        {r.tradeName}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
          {notConfigured.length > 0 && (
            <Card title={`Sem lista de documentos (${notConfigured.length})`} description="Abra o cliente e inclua a lista padrão.">
              <ul className="flex flex-wrap gap-2 text-sm">
                {notConfigured.map((r) => (
                  <li key={r.id}>
                    <Link href={`/clientes/${r.id}?aba=documentos&competencia=${competence}`} className="rounded-full bg-slate-100 px-3 py-1 hover:underline">
                      {r.tradeName}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
