import { beforeEach, describe, expect, it } from "vitest";
import { instantToLocalDate } from "@/domain/dates";
import { ForbiddenError, ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { addLeadActivity, changeLeadStage, convertLeadToClient, createLead, listLeads } from "@/server/services/leads";
import { createProcedure, getProcedure, listProcedures, updateProcedure } from "@/server/services/procedures";
import { currentMonth, getPortfolio, setHourCost } from "@/server/services/portfolio";
import { createProject, getProject, listProjects } from "@/server/services/projects";
import { createTask } from "@/server/services/tasks";
import { deleteTimeEntry, listTaskTime, logTime } from "@/server/services/time";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);
const today = () => instantToLocalDate(new Date(), "America/Sao_Paulo");
const tomorrow = () => instantToLocalDate(new Date(Date.now() + 86_400_000), "America/Sao_Paulo");

async function withClient() {
  const s = await setupOrg();
  const client = await createClient(s.admin, {
    legalName: "Cliente Ltda",
    tradeName: "Cliente",
    status: "ATIVO",
    services: [],
    monthlyFee: "3.000,00",
    billingDay: "10",
    responsibleOperatorId: s.op.userId,
    managerId: s.gestor.userId,
    memberIds: [],
  });
  return { ...s, client };
}

describe("apontamento de horas e rentabilidade", () => {
  it("apura horas, custo e margem por cliente no mês", async () => {
    const s = await withClient();
    await setHourCost(s.admin, 50);
    const task = await createTask(s.gestor, {
      clientId: s.client.id,
      title: "Conciliar",
      category: "CONCILIACAO_BANCARIA",
      dueDate: tomorrow(),
      dueTime: "18:00",
      assigneeId: s.op.userId,
    });
    await logTime(s.op, { taskId: task.id, workedOn: today(), minutes: "2:00", note: "extrato" });
    await logTime(s.op, { clientId: s.client.id, workedOn: today(), minutes: "60" });

    const p = await getPortfolio(s.admin, currentMonth());
    const row = p.rows.find((r) => r.id === s.client.id)!;
    expect(row.monthlyFee).toBe(3000);
    expect(row.minutes).toBe(180);
    expect(row.cost).toBe(150);
    expect(row.margin).toBe(2850);
    expect(p.totals.mrr).toBe(3000);
    expect(p.totals.margin).toBe(2850);
  });

  it("não permite data futura nem apontar em cliente sem acesso, e só o autor ou gestor remove", async () => {
    const s = await withClient();
    await expect(logTime(s.admin, { clientId: s.client.id, workedOn: tomorrow(), minutes: "30" })).rejects.toBeInstanceOf(ValidationError);
    // operador sem vínculo com o cliente
    await expect(logTime(s.op2, { clientId: s.client.id, workedOn: today(), minutes: "30" })).rejects.toThrow();

    const e = await logTime(s.op, { clientId: s.client.id, workedOn: today(), minutes: "30" });
    await expect(deleteTimeEntry(s.op2, e.id)).rejects.toThrow();
    await deleteTimeEntry(s.gestor, e.id);
  });

  it("operador não vê a carteira (valores comerciais)", async () => {
    const s = await withClient();
    await expect(getPortfolio(s.op, currentMonth())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lista as horas de uma tarefa", async () => {
    const s = await withClient();
    const task = await createTask(s.gestor, { clientId: s.client.id, title: "Tarefa", category: "OUTRAS", dueDate: tomorrow(), dueTime: "18:00", assigneeId: s.op.userId });
    await logTime(s.op, { taskId: task.id, workedOn: today(), minutes: "1,5" });
    const rows = await listTaskTime(s.op, task.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].minutes).toBe(90);
  });
});

describe("CRM", () => {
  it("percorre o funil, exige motivo da perda e converte em cliente", async () => {
    const s = await setupOrg();
    const lead = await createLead(s.gestor, { companyName: "Padaria Pão Quente", expectedFee: "2.500,00", servicesInterest: ["Contas a pagar"], contactEmail: "a@b.com" });
    await addLeadActivity(s.gestor, lead.id, { kind: "LIGACAO", body: "Primeiro contato" });
    await changeLeadStage(s.gestor, lead.id, { stage: "PROPOSTA" });
    await expect(changeLeadStage(s.gestor, lead.id, { stage: "PERDIDO" })).rejects.toBeInstanceOf(ValidationError);

    const board = await listLeads(s.gestor);
    expect(board.forecast.openFee).toBe(2500);
    expect(board.forecast.weightedFee).toBe(1250);

    // gestor não cria clientes; administrador converte
    await expect(convertLeadToClient(s.gestor, lead.id)).rejects.toBeInstanceOf(ForbiddenError);
    const client = await convertLeadToClient(s.admin, lead.id);
    expect(client.status).toBe("IMPLANTACAO");
    expect(Number(client.monthlyFee)).toBe(2500);
    await expect(convertLeadToClient(s.admin, lead.id)).rejects.toBeInstanceOf(ValidationError);
    await expect(changeLeadStage(s.admin, lead.id, { stage: "NOVO" })).rejects.toBeInstanceOf(ValidationError);

    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.stage).toBe("GANHO");
    expect(after.convertedClientId).toBe(client.id);
  });

  it("operador não acessa o CRM", async () => {
    const s = await setupOrg();
    await expect(listLeads(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("POPs", () => {
  it("versiona ao mudar o conteúdo e esconde rascunhos de operadores", async () => {
    const s = await setupOrg();
    const pop = await createProcedure(s.gestor, { title: "Conciliação diária", category: "CONCILIACAO_BANCARIA", status: "RASCUNHO", content: "1. Baixar extrato\n2. Conferir" });
    expect((await listProcedures(s.op)).length).toBe(0);
    expect((await listProcedures(s.op, { status: "RASCUNHO" })).length).toBe(0);
    expect((await listProcedures(s.gestor, { status: "RASCUNHO" })).length).toBe(1);
    await expect(getProcedure(s.op, pop.id)).rejects.toThrow();

    await updateProcedure(s.gestor, pop.id, { title: "Conciliação diária", category: "CONCILIACAO_BANCARIA", status: "PUBLICADO", content: "1. Baixar extrato\n2. Conferir\n3. Lançar" });
    expect((await getProcedure(s.op, pop.id)).version).toBe(2);
    expect((await listProcedures(s.op)).length).toBe(1);

    await updateProcedure(s.gestor, pop.id, { title: "Conciliação diária (novo título)", category: "CONCILIACAO_BANCARIA", status: "PUBLICADO", content: "1. Baixar extrato\n2. Conferir\n3. Lançar" });
    expect((await getProcedure(s.gestor, pop.id)).version).toBe(2);
    await expect(createProcedure(s.op, { title: "x y", category: "OUTRAS", status: "RASCUNHO", content: "algum conteúdo" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("projetos", () => {
  it("vincula tarefas, calcula progresso e respeita o cliente do projeto", async () => {
    const s = await withClient();
    const other = await createClient(s.admin, { legalName: "Outro Ltda", tradeName: "Outro", status: "ATIVO", services: [], memberIds: [] });
    const project = await createProject(s.gestor, { name: "Implantação", status: "EM_ANDAMENTO", clientId: s.client.id });
    const base = { title: "Passo", category: "IMPLANTACAO", dueDate: tomorrow(), dueTime: "18:00" };

    await createTask(s.gestor, { ...base, clientId: s.client.id, projectId: project.id });
    await expect(createTask(s.admin, { ...base, clientId: other.id, projectId: project.id })).rejects.toBeInstanceOf(ValidationError);

    const detail = await getProject(s.gestor, project.id);
    expect(detail.tasks).toHaveLength(1);
    const list = await listProjects(s.gestor);
    expect(list[0]).toMatchObject({ name: "Implantação", total: 1, done: 0 });
    await expect(createProject(s.op, { name: "Proj", status: "PLANEJADO" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("operador sem vínculo não enxerga projeto de cliente", async () => {
    const s = await withClient();
    const project = await createProject(s.admin, { name: "Privado", status: "PLANEJADO", clientId: s.client.id });
    await expect(getProject(s.op2, project.id)).rejects.toThrow();
    expect((await listProjects(s.op2)).length).toBe(0);
    expect((await listProjects(s.op)).length).toBe(1);
  });
});
