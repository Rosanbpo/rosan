import Link from "next/link";
import { ProposalDocument } from "@/components/proposal-document";
import { PrintButton } from "@/components/print-button";
import { instantToLocalDate } from "@/domain/dates";
import { APP_TIMEZONE } from "@/server/config";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getProposalDocument } from "@/server/services/proposals";

export const metadata = { title: "Proposta comercial" };

export default async function ProposalDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const { proposal, org } = await orNotFound(getProposalDocument(actor, id));
  const issuedOn = instantToLocalDate(proposal.sentAt ?? proposal.createdAt, APP_TIMEZONE);

  return (
    <div className="min-h-screen bg-slate-300 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-5 flex w-[210mm] max-w-full items-center justify-between gap-3 px-2">
        <Link href={`/propostas/${id}`} className="btn-secondary">
          ← Voltar
        </Link>
        <p className="hidden text-xs text-slate-600 sm:block">No diálogo de impressão, escolha “Salvar como PDF” e desative cabeçalhos e rodapés.</p>
        <PrintButton />
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <ProposalDocument
          proposal={{
            number: proposal.number,
            planName: proposal.planName,
            companyName: proposal.companyName,
            contactName: proposal.contactName,
            intro: proposal.intro,
            services: proposal.services,
            volumes: proposal.volumes,
            exclusions: proposal.exclusions,
            monthlyFee: proposal.monthlyFee,
            billingDay: proposal.billingDay,
            termMonths: proposal.termMonths,
            validUntilLocal: proposal.validUntilLocal,
            notes: proposal.notes,
            issuedOn,
          }}
          issuer={org}
        />
      </div>
    </div>
  );
}
