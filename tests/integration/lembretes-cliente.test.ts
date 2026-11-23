import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/permissions";
import { addReminder, deleteReminder, listReminders, reminderToTask, setReminderDone } from "@/server/services/client-reminders";
import { createClient } from "@/server/services/clients";
import { dayOverview, listTasks } from "@/server/services/tasks";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

async function setup() {
  const s = await setupOrg();
  const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [] });
  return { s, c };
}

describe("lembretes do cliente", () => {
  it("cria, marca e exclui", async () => {
    const { s, c } = await setup();
    const r = await addReminder(s.admin, c.id, "  Pedir extrato do Itaú ");
    expect(r.text).toBe("Pedir extrato do Itaú");
    await expect(addReminder(s.admin, c.id, "   ")).rejects.toBeInstanceOf(ValidationError);
    await setReminderDone(s.admin, r.id, true);
    expect((await listReminders(s.admin, c.id))[0].done).toBe(true);
    await deleteReminder(s.admin, r.id);
    expect(await listReminders(s.admin, c.id)).toHaveLength(0);
  });
  it("vira tarefa do cliente, marca como feito e não vira duas vezes", async () => {
    const { s, c } = await setup();
    const r = await addReminder(s.admin, c.id, "Solicitar contrato social");
    const task = await reminderToTask(s.admin, r.id, "2026-12-10");
    expect(task.clientId).toBe(c.id);
    const [saved] = await listReminders(s.admin, c.id);
    expect(saved.done).toBe(true);
    expect(saved.taskId).toBe(task.id);
    await expect(reminderToTask(s.admin, r.id, "2026-12-10")).rejects.toThrow(/já virou tarefa/);
    expect((await listTasks(s.admin, { clientId: c.id })).rows.map((t) => t.title)).toContain("Solicitar contrato social");
  });
  it("visão do dia separa hoje e atrasadas por cliente", async () => {
    const { s, c } = await setup();
    const base = { clientId: c.id, category: "OUTRAS", priority: "NORMAL", dueTime: "10:00", checklist: [], assigneeId: s.admin.userId };
    const { createTask } = await import("@/server/services/tasks");
    await createTask(s.admin, { ...base, title: "Atrasada", dueDate: "2026-11-01" });
    await createTask(s.admin, { ...base, title: "Hoje", dueDate: "2026-11-10" });
    await createTask(s.admin, { ...base, title: "Futura", dueDate: "2026-11-20" });
    const start = new Date("2026-11-10T03:00:00Z");
    const end = new Date("2026-11-11T03:00:00Z");
    const rows = await dayOverview(s.admin, start, end);
    expect(rows).toEqual([expect.objectContaining({ clientId: c.id, today: 1, late: 1, total: 2 })]);
  });
});
