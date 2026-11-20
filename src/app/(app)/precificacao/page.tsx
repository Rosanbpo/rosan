import { PageHeader } from "@/components/ui/layout";
import { PricingTabs } from "@/components/pricing-tabs";
import { PricingWizard } from "@/components/pricing-wizard";
import { requirePermission } from "@/server/context";
import { prisma } from "@/server/db";
import { DEFAULT_MINIMUM_WAGE } from "@/domain/consultive-pricing";

export const metadata = { title: "Precificação" };

export default async function PricingPage() {
  const actor = await requirePermission("pricing.manage");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { hourCost: true, capacityHours: true } });
  const monthStart = new Date(`${new Date().toISOString().slice(0, 7)}-01T00:00:00-03:00`);
  const used = await prisma.timeEntry.aggregate({ where: { organizationId: actor.organizationId, workedOn: { gte: monthStart } }, _sum: { minutes: true } });
  const usedHours = Math.round(((used._sum.minutes ?? 0) / 60) * 10) / 10;
  return (
    <>
      <PageHeader title="Precificação consultiva" description="Do diagnóstico ao contrato: descubra quanto cobrar de um novo cliente sem perder margem." />
      <PricingTabs active="consultiva" />
      <PricingWizard
        hourCost={org.hourCost === null ? null : Number(org.hourCost)}
        capacityHours={org.capacityHours}
        usedHours={usedHours}
        defaultWage={DEFAULT_MINIMUM_WAGE}
      />
    </>
  );
}
