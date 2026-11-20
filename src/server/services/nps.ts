import { npsScore } from "@/domain/nps";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { assertClientAccess, clientScope } from "./access";

export async function recordNps(actor: Actor, clientId: string, score: number, comment: string | null) {
  await assertClientAccess(actor, clientId);
  if (!Number.isInteger(score) || score < 0 || score > 10) throw new ValidationError("A nota deve ser de 0 a 10.");
  await prisma.clientNps.create({ data: { clientId, organizationId: actor.organizationId, score, comment: comment?.trim().slice(0, 1000) || null, recordedById: actor.userId } });
}

export async function clientNps(actor: Actor, clientId: string) {
  await assertClientAccess(actor, clientId);
  const rows = await prisma.clientNps.findMany({ where: { clientId }, orderBy: { answeredAt: "desc" }, take: 12 });
  return { rows, nps: npsScore(rows.map((r) => r.score)), last: rows[0] ?? null };
}

/** NPS geral e clientes sem nota há mais de 90 dias (ou nunca avaliados). */
export async function npsOverview(actor: Actor) {
  assertCan(actor, "dashboard.view");
  const since = new Date(Date.now() - 90 * 86_400_000);
  const [clients, rows] = await Promise.all([
    prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null, status: "ATIVO" }, select: { id: true, tradeName: true } }),
    prisma.clientNps.findMany({ where: { organizationId: actor.organizationId }, orderBy: { answeredAt: "desc" } }),
  ]);
  const latest = new Map<string, { score: number; at: Date }>();
  for (const r of rows) if (!latest.has(r.clientId)) latest.set(r.clientId, { score: r.score, at: r.answeredAt });
  const current = clients.map((c) => latest.get(c.id)).filter((x): x is { score: number; at: Date } => !!x).map((x) => x.score);
  const stale = clients.filter((c) => !latest.get(c.id) || latest.get(c.id)!.at < since);
  const detractors = clients.filter((c) => (latest.get(c.id)?.score ?? 10) <= 6);
  return { nps: npsScore(current), answered: current.length, total: clients.length, stale, detractors };
}
