import { AppointmentForm } from "@/components/appointment-form";
import { PageHeader } from "@/components/ui/layout";
import { orNotFound } from "@/server/page-utils";
import { requirePermission } from "@/server/context";
import { prisma } from "@/server/db";
import { clientScope } from "@/server/services/access";
import { getAppointment } from "@/server/services/appointments";

export const metadata = { title: "Compromisso" };

export default async function EditarCompromisso({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("dashboard.view");
  const { id } = await params;
  const a = await orNotFound(getAppointment(actor, id));
  const clients = await prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null }, select: { id: true, tradeName: true }, orderBy: { tradeName: "asc" } });
  return (
    <>
      <PageHeader breadcrumb={{ href: "/agenda", label: "Agenda" }} title="Editar compromisso" />
      <AppointmentForm id={id} clients={clients} values={{ title: a.title, date: a.localDate, startTime: a.startTime ?? "", endTime: a.endTime ?? "", notes: a.notes ?? "", clientId: a.clientId ?? "" }} />
    </>
  );
}
