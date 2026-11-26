import { AppointmentForm } from "@/components/appointment-form";
import { PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/context";
import { prisma } from "@/server/db";
import { clientScope } from "@/server/services/access";

export const metadata = { title: "Novo compromisso" };

export default async function NovoCompromisso({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const clients = await prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null }, select: { id: true, tradeName: true }, orderBy: { tradeName: "asc" } });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") ? (sp.data as string) : new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return (
    <>
      <PageHeader breadcrumb={{ href: "/agenda", label: "Agenda" }} title="Novo compromisso" />
      <AppointmentForm id={null} clients={clients} values={{ title: "", date, startTime: "", endTime: "", notes: "", clientId: "" }} />
    </>
  );
}
