import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { CONTRACT_STATUS_LABEL, settlementBalance } from "@/domain/contract";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { ConfirmAction } from "@/components/confirm-action";
import { removeDistratoAction, setContractStatusAction, startDistratoAction } from "@/app/actions/contracts";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getContract } from "@/server/services/contracts";

export const metadata = { title: "Contrato" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("contracts.manage");
  const { id } = await params;
  const c = await orNotFound(getContract(actor, id));
  const draft = c.status === "RASCUNHO";
  const hasDistrato = c.distratoClauses !== null;
  const anyValue = c.pendingMonthly !== null || c.unbilled !== null || c.credits !== null;

  return (
    <>
      <PageHeader
        breadcrumb={{ href: "/contratos", label: "Contratos" }}
        title={`Contrato ${c.number} · ${c.partyName}`}
        description={c.proposal ? `Gerado da proposta ${c.proposal.number}` : undefined}
        actions={
          <>
            <Link href={`/documento/contrato/${id}`} className="btn-primary" target="_blank">
              <FileText aria-hidden className="h-4 w-4" /> Ver contrato / PDF
            </Link>
            {draft && (
              <Link href={`/contratos/${id}/editar`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Situação" value={CONTRACT_STATUS_LABEL[c.status]} tone={c.status === "ASSINADO" ? "success" : c.status === "ENCERRADO" ? "warning" : "default"} />
        <Stat label="Mensalidade" value={fmtMoney(c.monthlyFee)} hint={`Vence dia ${c.billingDay} · ${c.termMonths} meses`} />
        <Stat label="Início" value={fmtLocalDate(c.startDate)} />
        <Stat label="Cliente" value={c.client ? <Link className="text-base text-brand-700 hover:underline" href={`/clientes/${c.client.id}`}>{c.client.tradeName}</Link> : "—"} />
      </div>

      <Card title="Andamento" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {draft && (
            <ConfirmAction action={setContractStatusAction.bind(null, id, "ASSINADO")} label="Marcar como assinado" confirm="Registrar que o contrato foi assinado? Depois disso ele não poderá ser editado (você pode reabri-lo como rascunho)." />
          )}
          {c.status === "ASSINADO" && (
            <>
              <ConfirmAction action={setContractStatusAction.bind(null, id, "ENCERRADO")} label="Marcar como encerrado" className="btn-secondary" confirm="Marcar o contrato como encerrado?" />
              <ConfirmAction action={setContractStatusAction.bind(null, id, "RASCUNHO")} label="Reabrir para edição" className="btn-ghost" confirm="Reabrir o contrato como rascunho para editar?" />
            </>
          )}
          {c.status === "ENCERRADO" && (
            <ConfirmAction action={setContractStatusAction.bind(null, id, "ASSINADO")} label="Reativar (voltar a assinado)" className="btn-ghost" confirm="Voltar o contrato para assinado?" />
          )}
        </div>
      </Card>

      <Card title="Distrato" description="Rescisão amigável do contrato, com cláusulas e valores de quitação editáveis.">
        {hasDistrato ? (
          <div className="space-y-3 text-sm">
            <p>
              Encerramento: <strong>{fmtLocalDate(c.endDate)}</strong>
              {anyValue && (
                <>
                  {" "}
                  · Saldo de quitação: <strong>{fmtMoney(settlementBalance(c))}</strong>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/documento/distrato/${id}`} className="btn-primary" target="_blank">
                <FileText aria-hidden className="h-4 w-4" /> Ver distrato / PDF
              </Link>
              <Link href={`/contratos/${id}/distrato`} className="btn-secondary">
                <Pencil aria-hidden className="h-4 w-4" /> Editar distrato
              </Link>
              <ConfirmAction action={removeDistratoAction.bind(null, id)} label="Descartar distrato" className="btn-ghost" confirm="Descartar o distrato e os valores informados?" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Nenhum distrato gerado para este contrato.</p>
            <ConfirmAction action={startDistratoAction.bind(null, id)} label="Gerar distrato" className="btn-secondary" confirm="Gerar o distrato com o texto padrão?" />
          </div>
        )}
      </Card>
    </>
  );
}
