import Link from "next/link";
import { Plus } from "lucide-react";
import { instantToLocalDate } from "@/domain/dates";
import { PROPOSAL_STATUSES, PROPOSAL_STATUS_LABEL, isProposalExpired, type ProposalStatus } from "@/domain/proposal";
import { Select } from "@/components/filter-select";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtDate, fmtLocalDate, fmtMoney } from "@/lib/format";
import { PROPOSAL_STYLE, cx } from "@/lib/ui";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { oneOf, str } from "@/server/page-utils";
import { listProposals } from "@/server/services/proposals";

export const metadata = { title: "Propostas" };

type SP = Record<string, string | string[] | undefined>;

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("crm.manage");
  const sp = await searchParams;
  const status = oneOf(str(sp, "situacao"), PROPOSAL_STATUSES);
  const rows = await listProposals(actor, { status, q: str(sp, "q") });
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);

  return (
    <>
      <PageHeader
        title="Propostas"
        description="Propostas comerciais prontas para enviar em PDF."
        actions={
          <Link href="/propostas/nova" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Nova proposta
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma proposta ainda" description="Crie a primeira proposta a partir de um lead ou do zero." action={<Link href="/propostas/nova" className="btn-primary">Criar proposta</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">Lista de propostas</caption>
            <thead>
              <tr>
                <th scope="col">Nº</th>
                <th scope="col">Empresa</th>
                <th scope="col">Plano</th>
                <th scope="col" className="text-right">Mensalidade</th>
                <th scope="col">Validade</th>
                <th scope="col">Situação</th>
                <th scope="col">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = isProposalExpired(r.status as ProposalStatus, r.validUntilLocal, today);
                const key = expired ? "VENCIDA" : (r.status as ProposalStatus);
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap tabular-nums">{r.number}</td>
                    <td>
                      <Link href={`/propostas/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {r.companyName}
                      </Link>
                    </td>
                    <td>{r.planName}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.monthlyFee)}</td>
                    <td className="whitespace-nowrap">{fmtLocalDate(r.validUntilLocal)}</td>
                    <td>
                      <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", PROPOSAL_STYLE[key])}>
                        {expired ? "Vencida" : PROPOSAL_STATUS_LABEL[r.status as ProposalStatus]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
