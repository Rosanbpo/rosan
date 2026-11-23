import { assertCan, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

/** Remove só o que a importação do Trello criou (tarefas, rotinas e modelos). Clientes ficam. */
export async function desfazerAmanda(actor: Actor) {
  assertCan(actor, "recurrences.manage");
  const org = actor.organizationId;
  const templates = await prisma.routineTemplate.findMany({
    where: { organizationId: org, description: { contains: "do Trello (Operacional clientes BPO)" } },
    select: { id: true },
  });
  const templateIds = templates.map((t) => t.id);
  const recs = await prisma.recurrence.findMany({ where: { organizationId: org, templateId: { in: templateIds } }, select: { id: true } });
  const recIds = recs.map((r) => r.id);
  return prisma.$transaction(async (tx) => {
    const tasks = await tx.task.deleteMany({ where: { organizationId: org, recurrenceId: { in: recIds } } });
    const r = await tx.recurrence.deleteMany({ where: { id: { in: recIds } } });
    const t = await tx.routineTemplate.deleteMany({ where: { id: { in: templateIds } } });
    return `Removidas ${tasks.count} tarefas, ${r.count} rotinas e ${t.count} modelos.`;
  });
}
