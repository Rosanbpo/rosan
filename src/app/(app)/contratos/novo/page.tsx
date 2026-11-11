import { PageHeader } from "@/components/ui/layout";
import { ContractForm } from "@/components/contract-form";
import { createContractAction } from "@/app/actions/contracts";
import { requirePermission } from "@/server/context";
import { orNotFound, str } from "@/server/page-utils";
import { clientOptions } from "@/server/services/clients";
import { contractDefaults } from "@/server/services/contracts";

export const metadata = { title: "Novo contrato" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission("contracts.manage");
  const sp = await searchParams;
  const [d, clients] = await Promise.all([orNotFound(contractDefaults(actor, str(sp, "proposta"))), clientOptions(actor)]);
  return (
    <>
      <PageHeader
        title="Novo contrato"
        description={d.proposalId ? "Dados preenchidos a partir da proposta. Complete os dados do cliente e revise as cláusulas." : "Preencha os dados e revise as cláusulas."}
        breadcrumb={{ href: "/contratos", label: "Contratos" }}
      />
      <ContractForm
        action={createContractAction}
        clients={clients.map((c) => ({ id: c.id, label: c.tradeName }))}
        submitLabel="Criar contrato"
        cancelHref="/contratos"
        values={{
          proposalId: d.proposalId,
          partyName: d.partyName,
          monthlyFee: d.monthlyFee === null ? "" : d.monthlyFee.toFixed(2).replace(".", ","),
          billingDay: d.billingDay,
          termMonths: d.termMonths,
          signCity: d.signCity,
          services: d.services.join("\n"),
          volumes: d.volumes.join("\n"),
          clauses: d.clauses,
        }}
      />
    </>
  );
}
