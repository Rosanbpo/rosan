import { PageHeader } from "@/components/ui/layout";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import { requirePermission } from "@/server/context";
import { scenarioBase } from "@/server/services/goals";

export const metadata = { title: "Simulador de cenários" };

export default async function SimulatorPage() {
  const actor = await requirePermission("dashboard.view");
  return (
    <>
      <PageHeader title="Simulador de cenários" description="E se eu ganhar mais clientes, perder alguns ou reajustar? Veja o efeito na receita, nas horas e na margem." />
      <ScenarioSimulator base={await scenarioBase(actor)} />
    </>
  );
}
