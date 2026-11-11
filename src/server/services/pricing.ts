import { calculatePricing, DEFAULT_PRICING, type PricingInput } from "@/domain/pricing";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { parseInput, pricingSchema } from "../validation";
import { recordAudit } from "./audit";

function fromRow(row: {
  costs: unknown;
  hoursPerDay: unknown;
  daysPerMonth: number;
  safetyFactor: unknown;
  markup: unknown;
  taxRate: unknown;
  plans: unknown;
}): PricingInput {
  return {
    costs: row.costs as PricingInput["costs"],
    hoursPerDay: Number(row.hoursPerDay),
    daysPerMonth: row.daysPerMonth,
    safetyFactor: Number(row.safetyFactor),
    markup: Number(row.markup),
    taxRate: Number(row.taxRate),
    plans: row.plans as PricingInput["plans"],
  };
}

/** Planilha salva da empresa, ou os valores iniciais da planilha da Rosan. */
export async function getPricing(actor: Actor) {
  assertCan(actor, "pricing.manage");
  const [row, org] = await Promise.all([
    prisma.pricingSheet.findUnique({ where: { organizationId: actor.organizationId } }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { hourCost: true } }),
  ]);
  const input = row ? fromRow(row) : DEFAULT_PRICING;
  return {
    saved: !!row,
    updatedAt: row?.updatedAt ?? null,
    input,
    result: calculatePricing(input),
    currentHourCost: org.hourCost === null ? null : Number(org.hourCost),
  };
}

export async function savePricing(actor: Actor, raw: unknown) {
  assertCan(actor, "pricing.manage");
  const v = parseInput(pricingSchema, raw);
  const data = {
    costs: v.costs,
    hoursPerDay: v.hoursPerDay,
    daysPerMonth: Math.round(v.daysPerMonth),
    safetyFactor: v.safetyFactor,
    markup: v.markup,
    taxRate: v.taxPercent / 100,
    plans: v.plans.map((p) => ({ name: p.name, finalPrice: p.finalPrice ?? null, tasks: p.tasks })),
  };
  await prisma.$transaction(async (tx) => {
    await tx.pricingSheet.upsert({
      where: { organizationId: actor.organizationId },
      create: { organizationId: actor.organizationId, ...data },
      update: data,
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Organization",
      entityId: actor.organizationId,
      action: "pricing.saved",
      summary: "Precificação atualizada",
    });
  });
}

/** Grava o custo/hora calculado como custo da hora da empresa (usado na rentabilidade). */
export async function applyHourCost(actor: Actor) {
  assertCan(actor, "pricing.manage");
  assertCan(actor, "org.settings");
  const { result, saved } = await getPricing(actor);
  if (!saved) throw new ValidationError("Salve a precificação antes de aplicar o custo da hora.");
  await prisma.organization.update({ where: { id: actor.organizationId }, data: { hourCost: result.hourCost } });
}
