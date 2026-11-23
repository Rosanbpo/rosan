import { instantToLocalDate } from "@/domain/dates";
import { assertCan, type Actor } from "@/domain/permissions";
import { BILLING_DAY, CLIENTS, FEE_PER_CLIENT, PARENT_NAME, PARENT_TOTAL_FEE, ROUTINES, clientTradeName } from "@/domain/import-amanda";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { createClient } from "./clients";
import { createRecurrence } from "./recurrences";

/** Importação única do Trello da Amanda. Pode rodar de novo sem duplicar nada. */
export async function importAmanda(actor: Actor) {
  assertCan(actor, "clients.manage");
  assertCan(actor, "recurrences.manage");
  const org = actor.organizationId;
  const report: string[] = [];
  const today = instantToLocalDate(new Date(), APP_TIMEZONE);

  const ensureClient = async (tradeName: string, extra: Record<string, unknown>) => {
    const found = await prisma.client.findFirst({ where: { organizationId: org, tradeName } });
    if (found) return found;
    const c = await createClient(actor, { legalName: tradeName, tradeName, status: "ATIVO", ...extra });
    report.push(`Cliente criado: ${tradeName}`);
    return c;
  };

  const parent = await ensureClient(PARENT_NAME, { services: ["BPO financeiro (escritório parceiro)"] });
  if (Number(parent.monthlyFee) === PARENT_TOTAL_FEE) {
    await prisma.client.update({ where: { id: parent.id }, data: { monthlyFee: null } });
    report.push(`Mensalidade de ${PARENT_NAME} zerada para não contar R$ 1.200 em dobro.`);
  }

  const ids: Record<string, string> = { parent: parent.id };
  for (const c of CLIENTS) {
    const name = clientTradeName(c);
    const row = await ensureClient(name, {
      monthlyFee: String(FEE_PER_CLIENT),
      billingDay: String(BILLING_DAY),
      software: c.software,
      services: ["BPO financeiro"],
      notes: `Cliente do escritório ${PARENT_NAME}. Sistema: ${c.software}. Bancos: ${c.banks}.`,
    });
    ids[c.key] = row.id;
    if (Number(row.monthlyFee) !== FEE_PER_CLIENT || row.billingDay !== BILLING_DAY) {
      await prisma.client.update({ where: { id: row.id }, data: { monthlyFee: FEE_PER_CLIENT, billingDay: BILLING_DAY } });
    }
  }

  let created = 0;
  let skipped = 0;
  for (const r of ROUTINES) {
    const clientId = ids[r.client];
    const owner = r.client === "parent" ? PARENT_NAME : clientTradeName(CLIENTS.find((c) => c.key === r.client)!);
    const name = `${r.title} — ${owner}`;
    if (await prisma.routineTemplate.findFirst({ where: { organizationId: org, name } })) {
      skipped++;
      continue;
    }
    const template = await prisma.routineTemplate.create({
      data: {
        organizationId: org,
        exclusiveClientId: clientId,
        name,
        title: r.title,
        description: [r.description, `Origem: cartão "${r.source}" do Trello (Operacional clientes BPO).`].filter(Boolean).join("\n\n"),
        category: r.category,
        frequency: r.mode === "DAILY" ? "DAILY_BUSINESS" : r.mode === "WEEKLY" ? "WEEKLY" : "MONTHLY_DAY",
        weekdays: r.mode === "WEEKLY" ? [r.weekday!] : [],
        monthDays: r.mode === "MONTHLY" ? [r.monthDay!] : [],
        dueTime: r.dueTime,
        leadDays: 0,
        startOffsetDays: 0,
        nonBusinessDayRule: "POSTPONE",
        checklistItems: { create: r.checklist.map((label, position) => ({ label, required: false, position })) },
      },
    });
    const base = {
      clientId,
      templateId: template.id,
      startDate: r.startDate ?? today,
      dueTime: r.dueTime,
      leadDays: "0",
      startOffsetDays: "0",
      nonBusinessDayRule: "POSTPONE",
      frequency: template.frequency,
      weekdays: template.weekdays.map(String),
      monthDays: template.monthDays.map(String),
    };
    const { recurrence } = await createRecurrence(actor, base);
    created++;

    // Estado de hoje, igual ao Trello.
    if (r.statusToday && !r.startDate) {
      const task = await prisma.task.findFirst({ where: { recurrenceId: recurrence.id }, include: { checklistItems: true }, orderBy: { dueAt: "asc" } });
      if (task) {
        const done = new Set(r.doneToday ?? []);
        for (const item of task.checklistItems) {
          if (done.has(item.label)) await prisma.checklistItem.update({ where: { id: item.id }, data: { done: true, doneAt: new Date(), doneById: actor.userId } });
        }
        await prisma.task.update({ where: { id: task.id }, data: { status: r.statusToday } });
      }
    }
  }
  report.push(`Rotinas criadas: ${created}; já existiam: ${skipped}.`);
  return report;
}
