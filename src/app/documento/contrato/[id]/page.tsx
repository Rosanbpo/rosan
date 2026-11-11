import Link from "next/link";
import { ContractDocument } from "@/components/contract-document";
import { PrintButton } from "@/components/print-button";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getContractDocument } from "@/server/services/contracts";

export const metadata = { title: "Contrato" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("contracts.manage");
  const { id } = await params;
  const { contract, org } = await orNotFound(getContractDocument(actor, id));
  return (
    <div className="min-h-screen bg-slate-300 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-5 flex w-[210mm] max-w-full items-center justify-between gap-3 px-2">
        <Link href={`/contratos/${id}`} className="btn-secondary">
          ← Voltar
        </Link>
        <p className="hidden text-xs text-slate-600 sm:block">No diálogo de impressão, escolha “Salvar como PDF” e desative cabeçalhos e rodapés.</p>
        <PrintButton />
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <ContractDocument contract={contract} issuer={org} />
      </div>
    </div>
  );
}
