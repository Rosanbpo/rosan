import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { ContractForm } from "@/components/contract-form";
import { updateContractAction } from "@/app/actions/contracts";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { clientOptions } from "@/server/services/clients";
import { getContract } from "@/server/services/contracts";

export const metadata = { title: "Editar contrato" };

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("contracts.manage");
  const { id } = await params;
  const [c, clients] = await Promise.all([orNotFound(getContract(actor, id)), clientOptions(actor)]);
  if (c.status !== "RASCUNHO") redirect(`/contratos/${id}`);
  return (
    <>
      <PageHeader title={`Editar contrato ${c.number}`} breadcrumb={{ href: `/contratos/${id}`, label: "Voltar ao contrato" }} />
      <ContractForm
        action={updateContractAction.bind(null, id)}
        clients={clients.map((x) => ({ id: x.id, label: x.tradeName }))}
        submitLabel="Salvar alterações"
        cancelHref={`/contratos/${id}`}
        values={{
          proposalId: c.proposalId,
          clientId: c.clientId,
          partyName: c.partyName,
          partyDocument: c.partyDocument,
          partyAddress: c.partyAddress,
          repName: c.repName,
          repCpf: c.repCpf,
          issuerRepName: c.issuerRepName,
          issuerRepRole: c.issuerRepRole,
          issuerRepCpf: c.issuerRepCpf,
          monthlyFee: c.monthlyFee.toFixed(2).replace(".", ","),
          billingDay: c.billingDay,
          termMonths: c.termMonths,
          startDate: c.startDate,
          signDate: c.signDate,
          signCity: c.signCity,
          services: c.services.join("\n"),
          volumes: c.volumes.join("\n"),
          clauses: c.clauses,
        }}
      />
    </>
  );
}
