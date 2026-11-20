import { billingDaysLabel } from "@/domain/installments";
import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { CONTRACT_STATUS_LABEL, settlementBalance } from "@/domain/contract";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { ConfirmAction } from "@/components/confirm-action";
import { removeDistratoAction, setContractStatusAction, startDistratoAction } from "@/app/actions/contracts";
import { fmtLocalDate, fmtMoney } from "@/lib/format";
import { CopyButton } from "@/components/copy-button";
import { cancelSignLinkAction, createSignLinkAction, emailSignLinkAction } from "@/app/actions/signature";
import { maskCpf } from "@/domain/signature";
import { headers } from "next/headers";
import { latestSignLink } from "@/server/services/signature";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/context";
import { orNotFound } from "@/server/page-utils";
import { getContract } from "@/server/services/contracts";

export const metadata = { title: "Contrato" };

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const actor = await requirePermission("contracts.manage");
  const { id } = await params;
  const c = await orNotFound(getContract(actor, id));
  const sign = await latestSignLink(actor, id);
  const h = await headers();
  const signUrl = sign ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/assinar/${sign.token}` : null;
  const clientEmail = c.client ? (await prisma.client.findUnique({ where: { id: c.client.id }, select: { contactEmail: true } }))?.contactEmail : null;
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
        <Stat label="Mensalidade" value={fmtMoney(c.monthlyFee)} hint={`Vence ${billingDaysLabel(c.billingDay, c.billingDay2)} · ${c.termMonths} meses`} />
        <Stat label="Início" value={fmtLocalDate(c.startDate)} />
        <Stat label="Cliente" value={c.client ? <Link className="text-base text-brand-700 hover:underline" href={`/clientes/${c.client.id}`}>{c.client.tradeName}</Link> : "—"} />
      </div>

      <Card title="Assinatura eletrônica" description="O cliente abre o link, lê o contrato e assina com nome, CPF e aceite. Ficam registrados data, hora, IP e a impressão digital do documento." className="mb-6">
        {sp.erro && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}
        {sp.enviado && <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✅ E-mail enviado ao cliente.</p>}
        {sign?.status === "ASSINADO" ? (
          <div className="space-y-2 text-sm">
            <p>✅ Assinado por <strong>{sign.signerName}</strong> (CPF {maskCpf(sign.signerCpf ?? "")}) em {sign.signedAt?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
            <Link href={`/assinar/${sign.token}`} target="_blank" className="btn-secondary btn-sm">Ver comprovante</Link>
          </div>
        ) : sign?.status === "PENDENTE" && signUrl ? (
          <div className="space-y-2 text-sm">
            <p>⏳ Aguardando assinatura. O link vale até {sign.expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly value={signUrl} className="input min-w-0 flex-1 text-xs" />
              <CopyButton text={signUrl} label="Copiar link" />
              <form action={createSignLinkAction.bind(null, id)}><button className="btn-secondary btn-sm">Gerar novo link</button></form>
              <form action={cancelSignLinkAction.bind(null, id)}><button className="btn-ghost btn-sm">Cancelar</button></form>
            </div>
            <form action={emailSignLinkAction.bind(null, id)} className="flex flex-wrap items-center gap-2">
              <input type="email" name="email" required defaultValue={clientEmail ?? ""} placeholder="e-mail do cliente" className="input min-w-0 flex-1 text-sm" />
              <button className="btn-secondary btn-sm">✉️ Enviar por e-mail</button>
            </form>
            <p className="text-xs text-slate-500">Alterar o contrato depois do envio invalida o link: gere outro.</p>
          </div>
        ) : draft ? (
          <form action={createSignLinkAction.bind(null, id)}><button className="btn-primary">Gerar link de assinatura</button></form>
        ) : (
          <p className="text-sm text-slate-600">Contrato {c.status === "ENCERRADO" ? "encerrado" : "já marcado como assinado"} sem assinatura eletrônica.</p>
        )}
      </Card>

      <Card title="Andamento" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {draft && (
            <ConfirmAction action={setContractStatusAction.bind(null, id, "ASSINADO")} label="Marcar como assinado" confirm="Registrar que o contrato foi assinado? Depois disso ele não poderá ser editado (você pode reabri-lo como rascunho)." />
          )}
          {c.status === "ASSINADO" && (
            <>
              <ConfirmAction action={setContractStatusAction.bind(null, id, "ENCERRADO")} label="Marcar como encerrado" className="btn-secondary" confirm="Marcar o contrato como encerrado?" />
              {sign?.status !== "ASSINADO" && <ConfirmAction action={setContractStatusAction.bind(null, id, "RASCUNHO")} label="Reabrir para edição" className="btn-ghost" confirm="Reabrir o contrato como rascunho para editar?" />}
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
