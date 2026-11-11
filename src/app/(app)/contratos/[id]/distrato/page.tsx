import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { DistratoForm } from "@/components/distrato-form";
import { updateDistratoAction } from "@/app/actions/contracts";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getContract } from "@/server/services/contracts";

export const metadata = { title: "Distrato" };

const money = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));

export default async function DistratoPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("contracts.manage");
  const { id } = await params;
  const c = await orNotFound(getContract(actor, id));
  if (!c.distratoClauses) redirect(`/contratos/${id}`);
  return (
    <>
      <PageHeader title={`Distrato do contrato ${c.number} · ${c.partyName}`} breadcrumb={{ href: `/contratos/${id}`, label: "Voltar ao contrato" }} />
      <DistratoForm
        action={updateDistratoAction.bind(null, id)}
        cancelHref={`/contratos/${id}`}
        values={{
          endDate: c.endDate,
          pendingMonthly: money(c.pendingMonthly),
          unbilled: money(c.unbilled),
          credits: money(c.credits),
          settleDays: c.settleDays,
          clauses: c.distratoClauses,
        }}
      />
    </>
  );
}
