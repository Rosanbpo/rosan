import { beforeEach, describe, expect, it } from "vitest";
import { instantToLocalDate, instantToLocalTime } from "@/domain/dates";
import { ForbiddenError, ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { addChecklistItem, createTask, deleteTask, listTasks, rescheduleTask, transitionTask } from "@/server/services/tasks";
import { finishTask, getRunningTimer, pauseTimer, startTimer, taskTrackedSeconds } from "@/server/services/timer";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);
const day = (n: number) => instantToLocalDate(new Date(Date.now() + n * 86_400_000), "America/Sao_Paulo");

async function scenario() {
  const s = await setupOrg();
  const client = await createClient(s.admin, {
    legalName: "Cliente Ltda",
    tradeName: "Cliente",
    status: "ATIVO",
    services: [],
    responsibleOperatorId: s.op.userId,
    managerId: s.gestor.userId,
    memberIds: [],
  });
  const mk = (title: string, extra: Record<string, unknown> = {}) =>
    createTask(s.gestor, { clientId: client.id, title, category: "OUTRAS", dueDate: day(3), dueTime: "17:30", assigneeId: s.op.userId, ...extra });
  return { ...s, client, mk };
}

/** Faz o cronômetro "ter começado" há alguns minutos. */
const backdate = (userId: string, minutes: number) =>
  prisma.runningTimer.update({ where: { userId }, data: { startedAt: new Date(Date.now() - minutes * 60_000) } });

describe("cronômetro", () => {
  it("inicia (tarefa passa a Em andamento), pausa e grava o tempo", async () => {
    const s = await scenario();
    const t = await s.mk("Conciliar");
    await startTimer(s.op, t.id);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("EM_ANDAMENTO");
    expect((await getRunningTimer(s.op))?.taskId).toBe(t.id);

    await backdate(s.op.userId, 25);
    await pauseTimer(s.op, t.id);
    expect(await getRunningTimer(s.op)).toBeNull();
    const entries = await prisma.timeEntry.findMany({ where: { taskId: t.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0].minutes).toBe(25);
    expect(entries[0].seconds).toBeGreaterThanOrEqual(25 * 60);
    expect(await taskTrackedSeconds(t.id)).toBeGreaterThanOrEqual(25 * 60);
  });

  it("um cronômetro por pessoa: iniciar outro pausa e registra o anterior", async () => {
    const s = await scenario();
    const a = await s.mk("Tarefa A");
    const b = await s.mk("Tarefa B");
    await startTimer(s.op, a.id);
    await backdate(s.op.userId, 10);
    await startTimer(s.op, b.id);
    expect((await getRunningTimer(s.op))?.taskId).toBe(b.id);
    expect((await prisma.timeEntry.findMany({ where: { taskId: a.id } })).map((e) => e.minutes)).toEqual([10]);
    expect(await prisma.runningTimer.count()).toBe(1);
  });

  it("iniciar de novo na mesma tarefa não duplica; pausa sem cronômetro dá erro", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await expect(pauseTimer(s.op, t.id)).rejects.toBeInstanceOf(ValidationError);
    await startTimer(s.op, t.id);
    await startTimer(s.op, t.id);
    expect(await prisma.runningTimer.count()).toBe(1);
  });

  it("descarta sessões de poucos segundos", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await startTimer(s.op, t.id);
    await pauseTimer(s.op, t.id);
    expect(await prisma.timeEntry.count()).toBe(0);
  });

  it("concluir pausa o cronômetro, registra o tempo e conclui", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await startTimer(s.op, t.id);
    await backdate(s.op.userId, 40);
    await finishTask(s.op, t.id);
    const done = await prisma.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(done.status).toBe("CONCLUIDA");
    expect(await getRunningTimer(s.op)).toBeNull();
    expect((await prisma.timeEntry.findMany({ where: { taskId: t.id } }))[0].minutes).toBe(40);
  });

  it("concluir respeita as regras (checklist obrigatório) e mantém o cronômetro rodando", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await addChecklistItem(s.gestor, t.id, "Conferir extrato", true);
    await startTimer(s.op, t.id);
    await expect(finishTask(s.op, t.id)).rejects.toBeInstanceOf(ValidationError);
    expect((await getRunningTimer(s.op))?.taskId).toBe(t.id);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("EM_ANDAMENTO");
  });

  it("com revisor, concluir envia para revisão", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa", { reviewerId: s.gestor.userId });
    await startTimer(s.op, t.id);
    await finishTask(s.op, t.id);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("EM_REVISAO");
  });

  it("não cronometra tarefa fechada, aguardando retorno ou de outra pessoa", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await expect(startTimer(s.op2, t.id)).rejects.toThrow();
    await transitionTask(s.op, t.id, "WAIT_CLIENT", { note: "Aguardando extrato", followUpDate: day(2) });
    await expect(startTimer(s.op, t.id)).rejects.toBeInstanceOf(ValidationError);
    await transitionTask(s.gestor, t.id, "CANCEL", { note: "Cancelada" });
    await expect(startTimer(s.op, t.id)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("mudar o dia e excluir tarefa", () => {
  it("muda o dia mantendo o horário; só quem participa pode", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await rescheduleTask(s.op, t.id, day(7));
    const after = await prisma.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(instantToLocalDate(after.dueAt, "America/Sao_Paulo")).toBe(day(7));
    expect(instantToLocalTime(after.dueAt, "America/Sao_Paulo")).toBe("17:30");
    await expect(rescheduleTask(s.op2, t.id, day(8))).rejects.toThrow();
    await expect(rescheduleTask(s.op, t.id, "31/12/2026")).rejects.toBeInstanceOf(ValidationError);
    const audit = await prisma.auditEvent.findFirst({ where: { taskId: t.id, action: "task.rescheduled" } });
    expect(audit).not.toBeNull();
  });

  it("não muda o dia de tarefa concluída", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await transitionTask(s.op, t.id, "COMPLETE");
    await expect(rescheduleTask(s.op, t.id, day(9))).rejects.toBeInstanceOf(ValidationError);
  });

  it("exclui: some das listas, para o cronômetro e preserva as horas", async () => {
    const s = await scenario();
    const t = await s.mk("Tarefa");
    await startTimer(s.op, t.id);
    await backdate(s.op.userId, 15);
    await deleteTask(s.gestor, t.id);
    expect((await listTasks(s.gestor, {})).total).toBe(0);
    expect(await prisma.runningTimer.count()).toBe(0);
    expect((await prisma.timeEntry.findMany({ where: { clientId: s.client.id } })).map((e) => e.minutes)).toEqual([15]);
    await expect(rescheduleTask(s.gestor, t.id, day(5))).rejects.toThrow(); // não é mais acessível
  });

  it("operador exclui só o que criou (manual); gestor exclui qualquer uma", async () => {
    const s = await scenario();
    const fromManager = await s.mk("Do gestor");
    await expect(deleteTask(s.op, fromManager.id)).rejects.toBeInstanceOf(ForbiddenError);
    const mine = await createTask(s.op, { clientId: s.client.id, title: "Minha", category: "OUTRAS", dueDate: day(2), dueTime: "10:00" });
    await deleteTask(s.op, mine.id);
    await deleteTask(s.gestor, fromManager.id);
    expect((await listTasks(s.admin, {})).total).toBe(0);
  });
});

import { clientPanelExtras } from "@/server/services/clients";
import { buildContractClauses } from "@/domain/contract";
import { createContract } from "@/server/services/contracts";
import { createProject } from "@/server/services/projects";

describe("painel do cliente", () => {
  it("reúne contratos, projetos e horas por mês e por pessoa, respeitando permissões", async () => {
    const s = await scenario();
    await createContract(s.admin, {
      clientId: s.client.id,
      partyName: "Cliente Ltda",
      monthlyFee: "1.000,00",
      services: "Contas a pagar | Controle",
      clauses: buildContractClauses(),
    });
    await createProject(s.gestor, { name: "Implantação", clientId: s.client.id, status: "EM_ANDAMENTO" });
    const t = await s.mk("Tarefa");
    await startTimer(s.op, t.id);
    await backdate(s.op.userId, 30);
    await pauseTimer(s.op, t.id);

    const extras = await clientPanelExtras(s.gestor, s.client.id);
    expect(extras.contracts).toHaveLength(1);
    expect(extras.projects.map((p) => p.name)).toEqual(["Implantação"]);
    expect(extras.hoursByMonth).toHaveLength(6);
    expect(extras.hoursByMonth.at(-1)?.minutes).toBe(30);
    expect(extras.hoursByPerson[0].minutes).toBe(30);

    const asOperator = await clientPanelExtras(s.op, s.client.id);
    expect(asOperator.contracts).toHaveLength(0); // operador não vê contratos
    await expect(clientPanelExtras(s.op2, s.client.id)).rejects.toThrow(); // sem vínculo
  });
});
