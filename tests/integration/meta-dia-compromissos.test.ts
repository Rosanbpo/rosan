import { describe, it, expect } from "vitest";
import { prisma } from "@/server/db";
import { createAppointment, updateAppointment, deleteAppointment, appointmentsBetween } from "@/server/services/appointments";
import { addToDayGoal, dayGoal, removeFromDayGoal } from "@/server/services/day-goal";
import { setupOrg } from "./helpers";

describe("compromissos e meta do dia", () => {
  it("cria, edita e exclui compromissos", async () => {
    const { admin } = await setupOrg();
    const a = await createAppointment(admin, { title: "Reunião", date: "2026-12-03", startTime: "10:00", endTime: "11:00" });
    await updateAppointment(admin, a.id, { title: "Reunião 2", date: "2026-12-04", startTime: "09:00", endTime: "" });
    const list = await appointmentsBetween(admin, "2026-12-01", "2026-12-31");
    expect(list.map((x) => `${x.title}|${x.startTime}|${x.endTime}`)).toEqual(["Reunião 2|09:00|null"]);
    await expect(createAppointment(admin, { title: "x", date: "2026-12-03", startTime: "10:00", endTime: "09:00" })).rejects.toThrow();
    await deleteAppointment(admin, a.id);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("meta do dia: conta tarefas concluídas", async () => {
    const { admin, org } = await setupOrg();
    const now = new Date();
    const mk = (title: string) => prisma.task.create({ data: { organizationId: org.id, title, category: "OUTRAS", dueAt: now, assigneeId: admin.userId, createdById: admin.userId, status: "A_FAZER" } });
    const t1 = await mk("A");
    const t2 = await mk("B");
    await addToDayGoal(admin, t1.id, now);
    await addToDayGoal(admin, t2.id, now);
    let g = await dayGoal(admin, now);
    expect(g.items.length).toBe(2);
    expect(g.done).toBe(0);
    await prisma.task.update({ where: { id: t1.id }, data: { status: "CONCLUIDA", completedAt: now } });
    g = await dayGoal(admin, now);
    expect(g.done).toBe(1);
    await removeFromDayGoal(admin, t2.id, now);
    g = await dayGoal(admin, now);
    expect(g.items.length).toBe(1);
    expect(g.done).toBe(g.items.length);
  });
});
