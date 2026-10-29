import { beforeEach, describe, expect, it } from "vitest";
import { localDateToDbDate } from "@/domain/dates";
import { isOverdue } from "@/domain/task-rules";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { createRecurrence, setRecurrenceStatus } from "@/server/services/recurrences";
import { runScheduler } from "@/server/services/generator";
import { createTemplate, updateTemplate } from "@/server/services/templates";
import { listTasks } from "@/server/services/tasks";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

const RULE = { dueTime: "18:00", leadDays: "3", startOffsetDays: "0", nonBusinessDayRule: "POSTPONE" };

async function scenario(rule: Record<string, unknown>, templateExtra: Record<string, unknown> = {}) {
  const s = await setupOrg();
  const client = await createClient(s.admin, {
    legalName: "Cliente Fictício Ltda",
    tradeName: "Cliente",
    status: "ATIVO",
    responsibleOperatorId: s.op.userId,
    managerId: s.gestor.userId,
  });
  const template = await createTemplate(s.admin, {
    name: "Fechamento",
    title: "Fechamento mensal",
    category: "FECHAMENTO_MENSAL",
    priority: "ALTA",
    competenceRule: "PREVIOUS_MONTH",
    checklist: [{ label: "Conciliar", required: true }],
    ...RULE,
    ...rule,
    ...templateExtra,
  });
  const { recurrence } = await createRecurrence(s.gestor, {
    clientId: client.id,
    templateId: template.id,
    startDate: "2027-01-01",
    reviewerId: s.gestor.userId,
    ...RULE,
    ...rule,
  });
  // Fixa o piso de geração para datas determinísticas no teste.
  await prisma.recurrence.update({ where: { id: recurrence.id }, data: { generationFloor: localDateToDbDate("2027-01-01") } });
  return { ...s, client, template, recurrence };
}

const tasksOf = (recurrenceId: string) =>
  prisma.task.findMany({ where: { recurrenceId }, orderBy: { dueAt: "asc" }, include: { checklistItems: true } });

describe("3/10. geração de recorrências", () => {
  it("dia 31 usa o último dia do mês, posterga fim de semana, aplica fuso e não duplica", async () => {
    const { recurrence, op, gestor } = await scenario({ frequency: "MONTHLY_DAY", monthDays: ["31"] });
    const now = new Date("2027-02-26T12:00:00Z"); // 26/02 em São Paulo; horizonte 01/03

    const first = await runScheduler({ trigger: "test", now });
    expect(first.created).toBe(2);
    const tasks = await tasksOf(recurrence.id);
    // 31/01/2027 é domingo → 01/02; 31/02 → 28/02/2027 (domingo) → 01/03
    expect(tasks.map((t) => t.occurrenceKey)).toEqual(["2027-01-31", "2027-02-28"]);
    expect(tasks.map((t) => t.dueAt.toISOString())).toEqual(["2027-02-01T21:00:00.000Z", "2027-03-01T21:00:00.000Z"]);
    expect(tasks[0]).toMatchObject({
      origin: "RECORRENTE",
      assigneeId: op.userId,
      reviewerId: gestor.userId,
      competence: "2027-01",
      title: "Fechamento mensal — 01/2027",
    });
    expect(tasks[0].checklistItems).toHaveLength(1);

    // Idempotência: execuções repetidas e simultâneas não duplicam
    const again = await runScheduler({ trigger: "test", now });
    expect(again.created).toBe(0);
    await Promise.all([runScheduler({ trigger: "a", now }), runScheduler({ trigger: "b", now }), runScheduler({ trigger: "c", now })]);
    expect(await prisma.task.count({ where: { recurrenceId: recurrence.id } })).toBe(2);
  });

  it("respeita feriados cadastrados e antecedência", async () => {
    const { recurrence, org } = await scenario({ frequency: "MONTHLY_DAY", monthDays: ["15"], leadDays: "0" });
    await prisma.holiday.create({ data: { organizationId: org.id, date: localDateToDbDate("2027-03-15"), name: "Feriado local" } });
    // 15/03/2027 é segunda e feriado → 16/03; com antecedência 0 só gera no próprio dia
    await runScheduler({ trigger: "test", now: new Date("2027-03-15T15:00:00Z") });
    let keys = (await tasksOf(recurrence.id)).map((t) => t.occurrenceKey);
    expect(keys).not.toContain("2027-03-15");
    await runScheduler({ trigger: "test", now: new Date("2027-03-16T15:00:00Z") });
    const tasks = await tasksOf(recurrence.id);
    keys = tasks.map((t) => t.occurrenceKey);
    expect(keys).toContain("2027-03-15");
    expect(tasks.find((t) => t.occurrenceKey === "2027-03-15")!.dueAt.toISOString()).toBe("2027-03-16T21:00:00.000Z");
  });

  it("alteração do modelo vale para as próximas ocorrências e preserva as geradas", async () => {
    const { recurrence, admin, template } = await scenario({ frequency: "MONTHLY_DAY", monthDays: ["10"] });
    await runScheduler({ trigger: "test", now: new Date("2027-01-08T12:00:00Z") });
    await updateTemplate(admin, template.id, {
      name: "Fechamento",
      title: "Fechamento revisado",
      category: "FECHAMENTO_MENSAL",
      priority: "CRITICA",
      competenceRule: "NONE",
      checklist: [
        { label: "Conciliar", required: true },
        { label: "Novo passo", required: true },
      ],
      frequency: "MONTHLY_DAY",
      monthDays: ["10"],
      ...RULE,
    });
    await runScheduler({ trigger: "test", now: new Date("2027-02-08T12:00:00Z") });
    const [jan, feb] = await tasksOf(recurrence.id);
    expect(jan).toMatchObject({ title: "Fechamento mensal — 12/2026", priority: "ALTA" });
    expect(jan.checklistItems).toHaveLength(1);
    expect(feb).toMatchObject({ title: "Fechamento revisado", priority: "CRITICA" });
    expect(feb.checklistItems).toHaveLength(2);
  });

  it("pausar interrompe novas gerações e preserva tarefas; vencidas continuam visíveis", async () => {
    const { recurrence, gestor } = await scenario({ frequency: "MONTHLY_DAY", monthDays: ["10"] });
    await runScheduler({ trigger: "test", now: new Date("2027-01-08T12:00:00Z") });
    // Um mês depois: a ocorrência de janeiro está vencida e a de fevereiro é gerada
    await runScheduler({ trigger: "test", now: new Date("2027-02-08T12:00:00Z") });
    const all = await listTasks(gestor, { open: true });
    const jan = all.rows.find((t) => t.occurrenceKey === "2027-01-10")!;
    expect(jan).toBeDefined();
    expect(isOverdue({ status: "A_FAZER", dueAt: jan.dueAt }, new Date("2027-02-08T12:00:00Z"))).toBe(true);
    expect(all.rows.map((t) => t.occurrenceKey)).toContain("2027-02-10");

    await setRecurrenceStatus(gestor, recurrence.id, "PAUSED");
    const res = await runScheduler({ trigger: "test", now: new Date("2027-03-08T12:00:00Z") });
    expect(res.created).toBe(0);
    expect(await prisma.task.count({ where: { recurrenceId: recurrence.id } })).toBe(2);
  });

  it("semanal, quinzenal e enésimo dia útil", async () => {
    const weekly = await scenario({ frequency: "WEEKLY", weekdays: ["1", "3"], leadDays: "0" });
    await runScheduler({ trigger: "test", now: new Date("2027-01-08T23:00:00Z") });
    // 01/01/2027 sexta. Segundas e quartas até 08/01: 04/01 e 06/01
    expect((await tasksOf(weekly.recurrence.id)).map((t) => t.occurrenceKey)).toEqual(["2027-01-04", "2027-01-06"]);

    await resetDb();
    const nth = await scenario({ frequency: "MONTHLY_NTH_BUSINESS_DAY", nthBusinessDay: "5", leadDays: "0" });
    await prisma.holiday.create({ data: { organizationId: nth.org.id, date: localDateToDbDate("2027-02-01"), name: "Feriado fictício" } });
    await runScheduler({ trigger: "test", now: new Date("2027-02-28T12:00:00Z") });
    // Jan/2027: 1 (sex),4,5,6,7 → 07/01. Fev/2027 com feriado no dia 1: 2,3,4,5,8 → 08/02
    expect((await tasksOf(nth.recurrence.id)).map((t) => t.occurrenceKey)).toEqual(["2027-01-07", "2027-02-08"]);
  });
});
