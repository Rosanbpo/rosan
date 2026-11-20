import { randomBytes } from "crypto";
import { z } from "zod";
import { checkVolume, DEFAULT_MINIMUM_WAGE, type Diagnosis } from "@/domain/consultive-pricing";
import { isCompetenceMonth } from "@/domain/closing";
import { NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { missingQuestions, readAnswers, toColumns, type Answers } from "@/domain/diagnosis-form";
import { prisma } from "../db";
import { isValidCnpj } from "../validation";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

const int = z.coerce.number().int().min(0).max(10_000_000).default(0);
const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const bool = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

export const diagnosisSchema = z.object({
  regime: z.enum(["MEI", "SIMPLES", "PRESUMIDO", "REAL"]).default("SIMPLES"),
  revenue: z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) || 0 : v), z.number().min(0).max(1_000_000_000)).default(0),
  bankAccounts: int,
  statementLines: int,
  entries: int,
  employees: int,
  catchUpMonths: int,
  inventory: bool,
  multiCnpj: bool,
  cardsAndMarketplaces: bool,
  wantsReports: bool,
  books: z.enum(["ORGANIZADA", "PARCIAL", "DESORGANIZADA"]).default("ORGANIZADA"),
  banks: text(1000),
  platforms: text(1000),
  cards: text(1000),
  notes: text(2000),
});
export type DiagnosisInput = z.infer<typeof diagnosisSchema>;

function parse(raw: unknown): DiagnosisInput {
  const r = diagnosisSchema.safeParse(raw);
  if (!r.success) throw new ValidationError("Confira os dados do diagnóstico.");
  return r.data;
}

export function toDiagnosis(row: { regime: string; revenue: unknown; bankAccounts: number; statementLines: number; entries: number; employees: number; inventory: boolean; multiCnpj: boolean; cardsAndMarketplaces: boolean; wantsReports: boolean; books: string; catchUpMonths: number }): Diagnosis {
  return { regime: row.regime as Diagnosis["regime"], revenue: Number(row.revenue), bankAccounts: row.bankAccounts, statementLines: row.statementLines, entries: row.entries, employees: row.employees, inventory: row.inventory, multiCnpj: row.multiCnpj, cardsAndMarketplaces: row.cardsAndMarketplaces, wantsReports: row.wantsReports, books: row.books as Diagnosis["books"], catchUpMonths: row.catchUpMonths };
}

export async function getDiagnosis(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  return prisma.clientDiagnosis.findUnique({ where: { clientId } });
}

/** Lançamento manual (ou ajuste) do diagnóstico pela equipe. */
export async function saveDiagnosis(actor: Actor, clientId: string, raw: unknown) {
  await assertClientAccess(actor, clientId);
  const answers = readAnswers(raw as Record<string, unknown>);
  const data = { ...toColumns(answers), answers: answers as unknown as object };
  await prisma.$transaction(async (tx) => {
    await tx.clientDiagnosis.upsert({
      where: { clientId },
      create: { clientId, organizationId: actor.organizationId, source: "MANUAL", ...data },
      update: data,
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Client", entityId: clientId, clientId, action: "DIAGNOSIS_SAVED", summary: "Diagnóstico do cliente atualizado" });
  });
}

/** Gera (ou renova) o link para o cliente preencher o diagnóstico. */
export async function createDiagnosisLink(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const token = randomBytes(24).toString("base64url");
  await prisma.clientDiagnosis.upsert({
    where: { clientId },
    create: { clientId, organizationId: actor.organizationId, token, tokenCreatedAt: new Date() },
    update: { token, tokenCreatedAt: new Date() },
  });
  return token;
}

export async function revokeDiagnosisLink(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  await prisma.clientDiagnosis.updateMany({ where: { clientId }, data: { token: null, tokenCreatedAt: null } });
}

const LINK_DAYS = 30;

/** Página pública: só devolve o nome do cliente e os campos já preenchidos. */
export async function diagnosisByToken(token: string) {
  if (!token || token.length < 20) return null;
  const row = await prisma.clientDiagnosis.findUnique({ where: { token }, include: { client: { select: { tradeName: true, archivedAt: true } } } });
  if (!row || row.client.archivedAt) return null;
  if (row.tokenCreatedAt && Date.now() - row.tokenCreatedAt.getTime() > LINK_DAYS * 86_400_000) return null;
  return row;
}

export async function submitDiagnosisByToken(token: string, raw: unknown) {
  const row = await diagnosisByToken(token);
  if (!row) throw new NotFoundError("Link inválido ou expirado. Peça um novo link.");
  const answers: Answers = readAnswers(raw as Record<string, unknown>);
  /** Em caso de erro, guarda o que já foi digitado (rascunho) para o cliente não perder o preenchimento. */
  const fail = async (message: string): Promise<never> => {
    await prisma.clientDiagnosis.update({ where: { clientId: row.clientId }, data: { answers: { ...answers, __draft: "1" } as unknown as object } });
    throw new ValidationError(message);
  };
  const missing = missingQuestions(answers);
  if (missing.length) await fail(`Faltam respostas: ${missing.slice(0, 4).map((q) => q.label.replace(/\?$/, "")).join("; ")}${missing.length > 4 ? ` e mais ${missing.length - 4}` : ""}.`);
  const cnpj = typeof answers.cnpj === "string" ? answers.cnpj : "";
  if (!isValidCnpj(cnpj)) await fail("O CNPJ informado parece inválido. Confira os números.");
  const data = { ...toColumns(answers), answers: answers as unknown as object };
  await prisma.$transaction(async (tx) => {
    await tx.clientDiagnosis.update({ where: { clientId: row.clientId }, data: { ...data, source: "CLIENTE", submittedAt: new Date() } });
    await recordAudit(tx, { organizationId: row.organizationId, actorId: null, entityType: "Client", entityId: row.clientId, clientId: row.clientId, action: "DIAGNOSIS_SUBMITTED", summary: "Cliente respondeu o diagnóstico pelo link" });
  });
}

/** Guarda a mensalidade e as horas usadas na precificação como base de comparação. */
export async function recordPricing(actor: Actor, clientId: string, raw: unknown, pricing: { fee: number; hours: number }) {
  await assertClientAccess(actor, clientId);
  const data = parse(raw);
  if (!(pricing.fee > 0)) throw new ValidationError("Informe a mensalidade.");
  await prisma.$transaction(async (tx) => {
    const extra = { pricedFee: pricing.fee, pricedHours: pricing.hours, pricedAt: new Date() };
    await tx.clientDiagnosis.upsert({
      where: { clientId },
      create: { clientId, organizationId: actor.organizationId, source: "MANUAL", ...data, ...extra },
      update: { ...data, ...extra },
    });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Client", entityId: clientId, clientId, action: "PRICING_RECORDED", summary: `Precificação registrada: R$ ${pricing.fee.toFixed(2)}/mês` });
  });
}

export async function saveVolume(actor: Actor, clientId: string, month: string, raw: { statementLines: unknown; entries: unknown; notes?: unknown }) {
  await assertClientAccess(actor, clientId);
  if (!isCompetenceMonth(month)) throw new ValidationError("Competência inválida.");
  const num = (v: unknown) => {
    const x = Number(v);
    if (!Number.isFinite(x) || x < 0 || x > 10_000_000) throw new ValidationError("Informe números válidos.");
    return Math.round(x);
  };
  const data = { statementLines: num(raw.statementLines), entries: num(raw.entries), notes: typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim().slice(0, 500) : null };
  await prisma.clientVolume.upsert({ where: { clientId_competence: { clientId, competence: month } }, create: { clientId, organizationId: actor.organizationId, competence: month, ...data }, update: data });
}

/** Últimos meses de movimentação, já comparados com a base da precificação. */
export async function volumeOverview(actor: Actor, clientId: string, months = 6) {
  await assertClientAccess(actor, clientId);
  const [diag, rows, org] = await Promise.all([
    prisma.clientDiagnosis.findUnique({ where: { clientId } }),
    prisma.clientVolume.findMany({ where: { clientId }, orderBy: { competence: "desc" }, take: months }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { hourCost: true } }),
  ]);
  if (!diag) return { diagnosis: null, rows: [] as never[] };
  const base = toDiagnosis(diag);
  const a = { minimumWage: DEFAULT_MINIMUM_WAGE, hourCost: org.hourCost === null ? null : Number(org.hourCost), overheadPct: 15, taxPct: 6 };
  const pricedFee = diag.pricedFee === null ? null : Number(diag.pricedFee);
  return {
    diagnosis: diag,
    rows: rows.map((r) => ({ ...r, check: checkVolume(base, r, a, pricedFee) })),
  };
}
