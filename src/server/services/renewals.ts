import { dbDateToLocalDate, instantToLocalDate } from "@/domain/dates";
import { adjustedFee, contractTimeline } from "@/domain/renewal";
import { assertCan, type Actor } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";

/** Contratos assinados com fim de prazo e próximo reajuste anual. */
export async function renewalsOverview(actor: Actor, indexPct: number) {
  assertCan(actor, "contracts.manage");
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);
  const rows = await prisma.contract.findMany({
    where: { organizationId: actor.organizationId, status: "ASSINADO", startDate: { not: null } },
    select: { id: true, number: true, partyName: true, clientId: true, monthlyFee: true, termMonths: true, startDate: true },
  });
  const items = rows.map((r) => {
    const fee = Number(r.monthlyFee);
    const t = contractTimeline(dbDateToLocalDate(r.startDate!), r.termMonths, today);
    return { id: r.id, number: r.number, partyName: r.partyName, clientId: r.clientId, fee, newFee: adjustedFee(fee, indexPct), ...t };
  });
  items.sort((a, b) => Math.min(a.daysToTermEnd < 0 ? 9999 : a.daysToTermEnd, a.daysToAnniversary) - Math.min(b.daysToTermEnd < 0 ? 9999 : b.daysToTermEnd, b.daysToAnniversary));
  return { today, items };
}

/** Quantos contratos pedem ação nos próximos 60 dias (fim de prazo ou reajuste). */
export async function renewalsDueCount(actor: Actor) {
  const { items } = await renewalsOverview(actor, 0);
  return items.filter((i) => (i.daysToTermEnd >= 0 && i.daysToTermEnd <= 60) || i.daysToAnniversary <= 60).length;
}
