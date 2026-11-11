import { Prisma } from "@prisma/client";
import { dbDateToLocalDate, instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { buildContractClauses, buildDistratoClauses, type Clause, type ContractStatus } from "@/domain/contract";
import { nextProposalNumber } from "@/domain/proposal";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { contractSchema, distratoSchema, parseInput } from "../validation";
import { recordAudit } from "./audit";

const today = () => instantToLocalDate(new Date(), APP_TIMEZONE);
const num = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
const day = (d: Date | null) => (d ? dbDateToLocalDate(d) : null);

type Row = Prisma.ContractGetPayload<Record<string, never>>;

function shape(c: Row) {
  return {
    ...c,
    status: c.status as ContractStatus,
    monthlyFee: Number(c.monthlyFee),
    pendingMonthly: num(c.pendingMonthly),
    unbilled: num(c.unbilled),
    credits: num(c.credits),
    startDate: day(c.startDate),
    signDate: day(c.signDate),
    endDate: day(c.endDate),
    clauses: c.clauses as unknown as Clause[],
    distratoClauses: (c.distratoClauses ?? null) as unknown as Clause[] | null,
  };
}

export async function listContracts(actor: Actor, filters: { status?: ContractStatus; q?: string } = {}) {
  assertCan(actor, "contracts.manage");
  const rows = await prisma.contract.findMany({
    where: {
      organizationId: actor.organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { OR: [{ partyName: { contains: filters.q, mode: "insensitive" } }, { number: { contains: filters.q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, partyName: true, monthlyFee: true, status: true, startDate: true, endDate: true, distratoClauses: true },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    partyName: r.partyName,
    monthlyFee: Number(r.monthlyFee),
    status: r.status as ContractStatus,
    startDate: day(r.startDate),
    hasDistrato: r.distratoClauses !== null,
  }));
}

export async function getContract(actor: Actor, id: string) {
  assertCan(actor, "contracts.manage");
  const row = await prisma.contract.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: { client: { select: { id: true, tradeName: true } }, proposal: { select: { id: true, number: true } } },
  });
  if (!row) throw new NotFoundError("Contrato não encontrado.");
  const { client, proposal, ...rest } = row;
  return { ...shape(rest), client, proposal };
}

export async function getContractDocument(actor: Actor, id: string) {
  const [contract, org] = await Promise.all([
    getContract(actor, id),
    prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: { name: true, legalName: true, cnpj: true, email: true, phone: true, website: true, city: true },
    }),
  ]);
  return { contract, org };
}

/** Dados iniciais do formulário de novo contrato, a partir de uma proposta (se houver). */
export async function contractDefaults(actor: Actor, proposalId?: string) {
  assertCan(actor, "contracts.manage");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { city: true } });
  const base = { clauses: buildContractClauses(), signCity: org.city ?? "", proposalId: null as string | null };
  if (!proposalId) {
    return { ...base, partyName: "", monthlyFee: null as number | null, billingDay: 10, termMonths: 6, services: [] as string[], volumes: [] as string[] };
  }
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, organizationId: actor.organizationId } });
  if (!p) throw new NotFoundError("Proposta não encontrada.");
  return {
    ...base,
    proposalId: p.id,
    partyName: p.companyName,
    monthlyFee: Number(p.monthlyFee) as number | null,
    billingDay: p.billingDay,
    termMonths: p.termMonths,
    services: p.services,
    volumes: p.volumes,
  };
}

async function assertClient(actor: Actor, clientId?: string) {
  if (!clientId) return;
  const c = await prisma.client.findFirst({ where: { id: clientId, organizationId: actor.organizationId } });
  if (!c) throw new ValidationError("Cliente não encontrado.");
}
async function assertProposal(actor: Actor, proposalId?: string) {
  if (!proposalId) return;
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, organizationId: actor.organizationId } });
  if (!p) throw new ValidationError("Proposta não encontrada.");
}

function toData(i: ReturnType<typeof contractSchema.parse>) {
  return {
    proposalId: i.proposalId ?? null,
    clientId: i.clientId ?? null,
    partyName: i.partyName,
    partyDocument: i.partyDocument ?? null,
    partyAddress: i.partyAddress ?? null,
    repName: i.repName ?? null,
    repCpf: i.repCpf ?? null,
    issuerRepName: i.issuerRepName ?? null,
    issuerRepRole: i.issuerRepRole ?? null,
    issuerRepCpf: i.issuerRepCpf ?? null,
    monthlyFee: i.monthlyFee,
    billingDay: i.billingDay,
    termMonths: i.termMonths,
    startDate: i.startDate ? localDateToDbDate(i.startDate) : null,
    signDate: i.signDate ? localDateToDbDate(i.signDate) : null,
    signCity: i.signCity ?? null,
    services: i.services,
    volumes: i.volumes,
    clauses: i.clauses as unknown as Prisma.InputJsonValue,
  };
}

export async function createContract(actor: Actor, raw: unknown) {
  assertCan(actor, "contracts.manage");
  const input = parseInput(contractSchema, raw);
  await Promise.all([assertClient(actor, input.clientId), assertProposal(actor, input.proposalId)]);
  const year = Number(today().slice(0, 4));
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const last = await tx.contract.findFirst({
          where: { organizationId: actor.organizationId, number: { startsWith: `${year}-` } },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const contract = await tx.contract.create({
          data: { organizationId: actor.organizationId, createdById: actor.userId, number: nextProposalNumber(year, last?.number ?? null), ...toData(input) },
        });
        await recordAudit(tx, {
          organizationId: actor.organizationId,
          actorId: actor.userId,
          entityType: "Contract",
          entityId: contract.id,
          action: "contract.created",
          summary: `Contrato ${contract.number} criado para ${contract.partyName}`,
        });
        return contract;
      });
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!conflict || attempt === 3) throw error;
    }
  }
  throw new Error("Não foi possível gerar o número do contrato.");
}

export async function updateContract(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "contracts.manage");
  const input = parseInput(contractSchema, raw);
  const current = await getContract(actor, id);
  if (current.status !== "RASCUNHO") throw new ValidationError("Contratos assinados ou encerrados não podem ser editados. Reabra o contrato como rascunho para alterar.");
  await Promise.all([assertClient(actor, input.clientId), assertProposal(actor, input.proposalId)]);
  await prisma.contract.update({ where: { id }, data: toData(input) });
}

export async function setContractStatus(actor: Actor, id: string, status: ContractStatus) {
  assertCan(actor, "contracts.manage");
  const current = await getContract(actor, id);
  if (current.status === status) return;
  if (status === "ENCERRADO" && current.distratoClauses === null) {
    // Encerrar não exige distrato (ex.: fim do prazo), mas a data de encerramento ajuda os relatórios.
  }
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id }, data: { status, ...(status === "ASSINADO" && !current.signDate ? { signDate: localDateToDbDate(today()) } : {}) } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Contract",
      entityId: id,
      action: "contract.status",
      summary: `Contrato ${current.number}: ${current.status} → ${status}`,
    });
  });
}

/** Cria o distrato do contrato com o texto padrão (editável depois). */
export async function startDistrato(actor: Actor, id: string) {
  assertCan(actor, "contracts.manage");
  const current = await getContract(actor, id);
  if (current.distratoClauses) return;
  await prisma.contract.update({
    where: { id },
    data: { distratoClauses: buildDistratoClauses() as unknown as Prisma.InputJsonValue, settleDays: 10 },
  });
}

export async function updateDistrato(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "contracts.manage");
  const input = parseInput(distratoSchema, raw);
  const current = await getContract(actor, id);
  if (!current.distratoClauses) throw new ValidationError("Gere o distrato antes de editá-lo.");
  await prisma.contract.update({
    where: { id },
    data: {
      endDate: input.endDate ? localDateToDbDate(input.endDate) : null,
      pendingMonthly: input.pendingMonthly ?? null,
      unbilled: input.unbilled ?? null,
      credits: input.credits ?? null,
      settleDays: input.settleDays ?? null,
      distratoClauses: input.distratoClauses as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function removeDistrato(actor: Actor, id: string) {
  assertCan(actor, "contracts.manage");
  await getContract(actor, id);
  await prisma.contract.update({
    where: { id },
    data: { distratoClauses: Prisma.DbNull, endDate: null, pendingMonthly: null, unbilled: null, credits: null, settleDays: null },
  });
}
