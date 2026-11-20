import { z } from "zod";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

const schema = z.object({ reason: z.string().trim().min(2, "Escolha o motivo.").max(100), detail: z.string().trim().max(1000).optional() });

/** Encerra o cliente registrando o motivo da saída. */
export async function closeClientWithChurn(actor: Actor, clientId: string, raw: unknown) {
  assertCan(actor, "clients.manage");
  await assertClientAccess(actor, clientId);
  const r = schema.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Confira os dados.");
  const c = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { monthlyFee: true, startDate: true, tradeName: true } });
  const months = c.startDate ? Math.max(0, Math.round((Date.now() - c.startDate.getTime()) / (30.44 * 86_400_000))) : null;
  await prisma.$transaction(async (tx) => {
    await tx.clientChurn.upsert({
      where: { clientId },
      create: { clientId, organizationId: actor.organizationId, reason: r.data.reason, detail: r.data.detail || null, monthlyFee: c.monthlyFee, monthsActive: months, recordedById: actor.userId },
      update: { reason: r.data.reason, detail: r.data.detail || null, monthlyFee: c.monthlyFee, monthsActive: months, leftAt: new Date() },
    });
    await tx.client.update({ where: { id: clientId }, data: { status: "ENCERRADO" } });
    await recordAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, entityType: "Client", entityId: clientId, clientId, action: "CLIENT_CHURN", summary: `Cliente encerrado: ${r.data.reason}` });
  });
}

export async function churnOverview(actor: Actor) {
  assertCan(actor, "dashboard.view");
  const rows = await prisma.clientChurn.findMany({ where: { organizationId: actor.organizationId }, orderBy: { leftAt: "desc" }, include: { client: { select: { id: true, tradeName: true } } } });
  const byReason = new Map<string, { count: number; fee: number }>();
  for (const r of rows) {
    const e = byReason.get(r.reason) ?? { count: 0, fee: 0 };
    e.count++;
    e.fee += Number(r.monthlyFee ?? 0);
    byReason.set(r.reason, e);
  }
  const lostMrr = rows.reduce((a, r) => a + Number(r.monthlyFee ?? 0), 0);
  const withMonths = rows.filter((r) => r.monthsActive !== null);
  return {
    rows,
    lostMrr,
    avgMonths: withMonths.length ? Math.round(withMonths.reduce((a, r) => a + (r.monthsActive ?? 0), 0) / withMonths.length) : null,
    byReason: [...byReason.entries()].map(([reason, v]) => ({ reason, ...v })).sort((a, b) => b.count - a.count),
  };
}
