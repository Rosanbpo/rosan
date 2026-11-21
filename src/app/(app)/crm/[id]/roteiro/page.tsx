import Link from "next/link";
import { DiagnosisScript } from "@/components/diagnosis-script";
import { PageHeader } from "@/components/ui/layout";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { leadScript } from "@/server/services/lead-script";

export const metadata = { title: "Roteiro da reunião de diagnóstico" };

export default async function LeadScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("crm.manage");
  const { id } = await params;
  const data = await orNotFound(leadScript(actor, id));
  return (
    <>
      <PageHeader title={`Reunião de diagnóstico: ${data.lead.companyName}`} breadcrumb={{ href: `/crm/${id}`, label: "Voltar ao lead" }} description="Siga o roteiro, marque o que já foi falado e anote durante a conversa. Tudo é salvo sozinho." />
      {can(actor, "templates.manage") && <p className="mb-3 text-xs text-slate-500">Para mudar as falas, edite o documento “Roteiro da reunião de diagnóstico” em <Link href="/biblioteca?secao=jornada" className="text-brand-700 hover:underline">Estrutura Rosan</Link>.</p>}
      <DiagnosisScript leadId={id} script={data.script} initialChecked={data.checked} initialNotes={data.notes} initialFinal={data.finalNotes} />
    </>
  );
}
