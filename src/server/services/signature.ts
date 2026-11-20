import { randomBytes } from "node:crypto";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { documentHash, formatCpf, isValidCpf, onlyDigits, SIGN_LINK_DAYS } from "@/domain/signature";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { recordAudit } from "./audit";
import { getContract } from "./contracts";

type ContractLike = Awaited<ReturnType<typeof getContract>>;

/** O que o cliente está assinando: qualquer mudança aqui muda a impressão digital. */
export function contractContent(c: Pick<ContractLike, "number" | "partyName" | "partyDocument" | "partyAddress" | "repName" | "repCpf" | "issuerRepName" | "issuerRepRole" | "issuerRepCpf" | "monthlyFee" | "billingDay" | "billingDay2" | "firstInstallmentPct" | "termMonths" | "startDate" | "signCity" | "services" | "volumes" | "clauses">) {
  const { number, partyName, partyDocument, partyAddress, repName, repCpf, issuerRepName, issuerRepRole, issuerRepCpf, monthlyFee, billingDay, billingDay2, firstInstallmentPct, termMonths, startDate, signCity, services, volumes, clauses } = c;
  return { number, partyName, partyDocument, partyAddress, repName, repCpf, issuerRepName, issuerRepRole, issuerRepCpf, monthlyFee, billingDay, billingDay2, firstInstallmentPct, termMonths, startDate, signCity, services, volumes, clauses };
}

export async function createSignLink(actor: Actor, contractId: string) {
  assertCan(actor, "contracts.manage");
  const c = await getContract(actor, contractId);
  if (c.status !== "RASCUNHO") throw new ValidationError("Só é possível enviar para assinatura um contrato em rascunho.");
  const token = randomBytes(24).toString("hex");
  await prisma.$transaction(async (tx) => {
    await tx.contractSignLink.updateMany({ where: { contractId, status: "PENDENTE" }, data: { status: "CANCELADO" } });
    await tx.contractSignLink.create({
      data: { organizationId: actor.organizationId, contractId, token, docHash: documentHash(contractContent(c)), expiresAt: new Date(Date.now() + SIGN_LINK_DAYS * 86_400_000), createdById: actor.userId },
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Contract", entityId: contractId, action: "contract.sign_link", summary: `Contrato ${c.number}: enviado para assinatura eletrônica` });
  });
  return token;
}

export async function cancelSignLink(actor: Actor, contractId: string) {
  assertCan(actor, "contracts.manage");
  await getContract(actor, contractId);
  await prisma.contractSignLink.updateMany({ where: { contractId, organizationId: actor.organizationId, status: "PENDENTE" }, data: { status: "CANCELADO" } });
}

/** Último link do contrato (para a tela do contrato). */
export async function latestSignLink(actor: Actor, contractId: string) {
  assertCan(actor, "contracts.manage");
  return prisma.contractSignLink.findFirst({ where: { contractId, organizationId: actor.organizationId }, orderBy: { createdAt: "desc" } });
}

export async function hasSignedLink(contractId: string) {
  return (await prisma.contractSignLink.count({ where: { contractId, status: "ASSINADO" } })) > 0;
}

/** Visão pública (sem login) do contrato por token. */
export async function publicSignView(token: string) {
  if (token.length < 32) return null;
  const link = await prisma.contractSignLink.findUnique({ where: { token } });
  if (!link) return null;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: link.organizationId }, select: { name: true, legalName: true, cnpj: true, email: true, phone: true, website: true, city: true } });
  // Reaproveita a mesma montagem do contrato interno, sem exigir login.
  const contract = await getContract({ userId: "public", organizationId: link.organizationId, role: "ADMIN", name: "Público" }, link.contractId);
  const changed = link.status === "PENDENTE" && documentHash(contractContent(contract)) !== link.docHash;
  const expired = link.status === "PENDENTE" && link.expiresAt < new Date();
  return { link, contract, org, changed, expired };
}

export async function signByToken(token: string, raw: { name: string; cpf: string; agree: boolean }, meta: { ip: string | null; agent: string | null }) {
  const view = await publicSignView(token);
  if (!view) throw new NotFoundError("Link de assinatura inválido.");
  const { link, contract } = view;
  if (link.status === "ASSINADO") throw new ValidationError("Este contrato já foi assinado.");
  if (link.status !== "PENDENTE") throw new ValidationError("Este link foi cancelado. Peça um novo link para a Rosan Finanças.");
  if (view.expired) throw new ValidationError("Este link expirou. Peça um novo link para a Rosan Finanças.");
  if (view.changed) throw new ValidationError("O contrato foi alterado depois do envio. Peça um novo link para a Rosan Finanças.");
  const name = raw.name.trim().replace(/\s+/g, " ");
  if (name.split(" ").length < 2 || name.length > 120) throw new ValidationError("Digite seu nome completo.");
  if (!isValidCpf(raw.cpf)) throw new ValidationError("CPF inválido. Confira os números.");
  if (!raw.agree) throw new ValidationError("Marque a caixa confirmando que leu e concorda com o contrato.");
  await prisma.$transaction(async (tx) => {
    const done = await tx.contractSignLink.updateMany({
      where: { id: link.id, status: "PENDENTE" },
      data: { status: "ASSINADO", signerName: name, signerCpf: onlyDigits(raw.cpf), signedAt: new Date(), signerIp: meta.ip, signerAgent: meta.agent?.slice(0, 300) ?? null },
    });
    if (done.count !== 1) throw new ValidationError("Este contrato já foi assinado.");
    await tx.contract.update({
      where: { id: link.contractId },
      data: { status: "ASSINADO", ...(contract.signDate ? {} : { signDate: localDateToDbDate(instantToLocalDate(new Date(), APP_TIMEZONE)) }) },
    });
    await recordAudit(tx, { organizationId: link.organizationId, actorId: null, entityType: "Contract", entityId: link.contractId, action: "contract.signed_online", summary: `Contrato ${contract.number} assinado eletronicamente por ${name} (CPF ${formatCpf(raw.cpf).replace(/^\d{3}\./, "***.").replace(/-\d{2}$/, "-**")})` });
  });
}
