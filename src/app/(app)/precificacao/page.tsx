import { PageHeader } from "@/components/ui/layout";
import { PricingForm } from "@/components/pricing-form";
import { applyHourCostAction, savePricingAction } from "@/app/actions/pricing";
import { requirePermission } from "@/server/context";
import { can } from "@/domain/permissions";
import { getPricing } from "@/server/services/pricing";

export const metadata = { title: "Precificação" };

export default async function PricingPage() {
  const actor = await requirePermission("pricing.manage");
  const data = await getPricing(actor);
  return (
    <>
      <PageHeader
        title="Precificação"
        description="Descubra seu custo por hora, monte o tempo de cada plano e veja o preço, o imposto e o lucro. Tudo pode ser editado e fica salvo."
      />
      <PricingForm
        action={savePricingAction}
        applyAction={applyHourCostAction}
        canApply={can(actor, "org.settings")}
        saved={data.saved}
        currentHourCost={data.currentHourCost}
        initial={{
          costs: data.input.costs,
          hoursPerDay: data.input.hoursPerDay,
          daysPerMonth: data.input.daysPerMonth,
          safetyFactor: data.input.safetyFactor,
          markup: data.input.markup,
          taxPercent: Math.round(data.input.taxRate * 10000) / 100,
          plans: data.input.plans,
        }}
      />
    </>
  );
}
