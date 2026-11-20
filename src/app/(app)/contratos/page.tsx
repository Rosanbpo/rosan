import Link from "next/link";
import { Plus } from "lucide-react";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "@/domain/contract";
import { Select } from "@/components/filter-select";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { CONTRACT_STYLE, cx } from "@/lib/ui";
import { requirePermission } from "@/server/context";
import { oneOf, str } from "@/server/page-utils";
import { listContracts } from "@/server/services/contracts";

export const metadata = { title: "Contratos" };

type SP = Record<string, string | string[] | undefined>;
const STATUSES = ["RASCUNHO", "ASSINADO", "ENCERRADO"] as const;

export default async function ContractsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePermission("contracts.manage");
  const sp = await searchParams;
  const status = oneOf(str(sp, "situacao"), STATUSES);
  const rows = await listContracts(actor, { status, q: str(sp, "q") });
  return (
    <>
      <PageHeader
        title="Contratos"
        description="Contratos e distratos de prestação de serviços, com cláusulas editáveis."
        actions={
          <>
          <Link href="/contratos/renovacoes" className="btn-secondary">🔄 Renovações e reajustes</Link>
          <Link href="/contratos/novo" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> Novo contrato
          </Link>
          </>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Nenhum contrato ainda" description="Crie um contrato a partir de uma proposta ou do zero." action={<Link href="/contratos/novo" className="btn-primary">Criar contrato</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">Lista de contratos</caption>
            <thead>
              <tr>
                <th scope="col">Nº</th>
                <th scope="col">Contratante</th>
                <th scope="col" className="text-right">Mensalidade</th>
                <th scope="col">Início</th>
                <th scope="col">Situação</th>
                <th scope="col">Distrato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap tabular-nums">{r.number}</td>
                  <td>
                    <Link href={`/contratos/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                      {r.partyName}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{fmtMoney(r.monthlyFee)}</td>
                  <td>{fmtLocalDate(r.startDate)}</td>
                  <td>
                    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", CONTRACT_STYLE[r.status as ContractStatus])}>{CONTRACT_STATUS_LABEL[r.status]}</span>
                  </td>
                  <td>{r.hasDistrato ? "Sim" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
