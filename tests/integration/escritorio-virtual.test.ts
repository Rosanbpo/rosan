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

import { createProposal, listProposals, setProposalStatus, updateProposal } from "@/server/services/proposals";

describe("propostas", () => {
  const base = {
    planName: "Plano Intermediário",
    companyName: "Padaria Pão Quente",
    services: "Contas a pagar | Controle\nContas a receber | Controle",
    volumes: "Notas fiscais por mês | até 100",
    exclusions: "Decisões gerenciais",
    monthlyFee: "1.000,00",
    validUntil: "2099-12-31",
  };

  it("numera em sequência, vincula ao lead e move o funil ao enviar", async () => {
    const s = await setupOrg();
    const lead = await createLead(s.gestor, { companyName: "Padaria Pão Quente" });
    const a = await createProposal(s.gestor, { ...base, leadId: lead.id });
    const b = await createProposal(s.gestor, { ...base, companyName: "Outra Empresa" });
    const year = new Date().getFullYear();
    expect(a.number).toBe(`${year}-001`);
    expect(b.number).toBe(`${year}-002`);
    expect(Number(a.monthlyFee)).toBe(1000);

    await setProposalStatus(s.gestor, a.id, "ENVIADA");
    const moved = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(moved.stage).toBe("PROPOSTA");
    expect((await listProposals(s.gestor)).length).toBe(2);
  });

  it("proposta aceita não pode ser editada e operador não acessa", async () => {
    const s = await setupOrg();
    const p = await createProposal(s.admin, base);
    await setProposalStatus(s.admin, p.id, "ENVIADA");
    await setProposalStatus(s.admin, p.id, "ACEITA");
    await expect(updateProposal(s.admin, p.id, base)).rejects.toBeInstanceOf(ValidationError);
    await expect(listProposals(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("propostas de outra empresa não são visíveis", async () => {
    const a = await setupOrg();
    const b = await setupOrg();
    const p = await createProposal(a.admin, base);
    await expect(updateProposal(b.admin, p.id, base)).rejects.toThrow();
    expect((await listProposals(b.admin)).length).toBe(0);
  });
});

import { applyHourCost, getPricing, savePricing } from "@/server/services/pricing";
import { buildContractClauses, buildDistratoClauses } from "@/domain/contract";
import { contractDefaults, createContract, getContract, listContracts, removeDistrato, setContractStatus, startDistrato, updateContract, updateDistrato } from "@/server/services/contracts";

describe("precificação salva", () => {
  const form = {
    costs: [{ label: "Pró-labore", amount: "5.000,00" }, { label: "Internet", amount: "150" }],
    hoursPerDay: "6",
    daysPerMonth: "21",
    safetyFactor: "1,1",
    markup: "1,6",
    taxPercent: "6",
    plans: [{ name: "Plano Teste", finalPrice: "800,00", tasks: [{ name: "Conciliação", minutes: "120" }] }],
  };

  it("usa a planilha da Rosan antes de salvar e persiste depois", async () => {
    const s = await setupOrg();
    const first = await getPricing(s.admin);
    expect(first.saved).toBe(false);
    expect(first.result.hourCost).toBe(74.56);

    await savePricing(s.admin, form);
    const saved = await getPricing(s.admin);
    expect(saved.saved).toBe(true);
    expect(saved.input.costs).toHaveLength(2);
    expect(saved.input.taxRate).toBeCloseTo(0.06);
    expect(saved.result.plans[0].price).toBe(800);
    // (5150 / 126) * 1,1 = 44,96
    expect(saved.result.hourCost).toBeCloseTo(44.96, 1);
  });

  it("aplica o custo da hora (só admin) e bloqueia operador", async () => {
    const s = await setupOrg();
    await expect(applyHourCost(s.admin)).rejects.toBeInstanceOf(ValidationError);
    await savePricing(s.admin, form);
    await applyHourCost(s.admin);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: s.admin.organizationId } });
    expect(Number(org.hourCost)).toBeCloseTo(44.96, 1);
    await expect(applyHourCost(s.gestor)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getPricing(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejeita valores inválidos", async () => {
    const s = await setupOrg();
    await expect(savePricing(s.admin, { ...form, hoursPerDay: "abc" })).rejects.toBeInstanceOf(ValidationError);
    await expect(savePricing(s.admin, { ...form, markup: "0,5" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("contratos e distratos", () => {
  const proposal = {
    planName: "Plano Intermediário",
    companyName: "Padaria Pão Quente",
    services: "Contas a pagar | Controle\nContas a receber | Controle",
    volumes: "Notas fiscais por mês | até 100",
    exclusions: "Decisões gerenciais",
    monthlyFee: "1.000,00",
    validUntil: "2099-12-31",
  };
  const form = (extra: Record<string, unknown> = {}) => ({
    partyName: "Padaria Pão Quente Ltda",
    monthlyFee: "1.000,00",
    billingDay: "10",
    termMonths: "6",
    services: "Contas a pagar | Controle",
    volumes: "Notas fiscais por mês | até 100",
    clauses: buildContractClauses(),
    ...extra,
  });

  it("pré-preenche a partir da proposta, numera e lista", async () => {
    const s = await setupOrg();
    const p = await createProposal(s.admin, proposal);
    const d = await contractDefaults(s.admin, p.id);
    expect(d.partyName).toBe("Padaria Pão Quente");
    expect(d.monthlyFee).toBe(1000);
    expect(d.services).toHaveLength(2);

    const a = await createContract(s.gestor, form({ proposalId: p.id }));
    const b = await createContract(s.gestor, form({ partyName: "Outra Empresa" }));
    const year = new Date().getFullYear();
    expect(a.number).toBe(`${year}-001`);
    expect(b.number).toBe(`${year}-002`);
    expect((await listContracts(s.gestor)).length).toBe(2);
  });

  it("edita rascunho, trava depois de assinado e permite reabrir", async () => {
    const s = await setupOrg();
    const c = await createContract(s.admin, form());
    await updateContract(s.admin, c.id, form({ partyName: "Nome Novo", clauses: [{ title: "Única", text: "Texto livre." }] }));
    const edited = await getContract(s.admin, c.id);
    expect(edited.partyName).toBe("Nome Novo");
    expect(edited.clauses).toHaveLength(1);

    await setContractStatus(s.admin, c.id, "ASSINADO");
    expect((await getContract(s.admin, c.id)).signDate).not.toBeNull();
    await expect(updateContract(s.admin, c.id, form())).rejects.toBeInstanceOf(ValidationError);
    await setContractStatus(s.admin, c.id, "RASCUNHO");
    await updateContract(s.admin, c.id, form({ partyName: "Depois de reabrir" }));
    expect((await getContract(s.admin, c.id)).partyName).toBe("Depois de reabrir");
  });

  it("gera, edita e descarta o distrato", async () => {
    const s = await setupOrg();
    const c = await createContract(s.admin, form());
    await expect(updateDistrato(s.admin, c.id, { distratoClauses: buildDistratoClauses() })).rejects.toBeInstanceOf(ValidationError);
    await startDistrato(s.admin, c.id);
    await updateDistrato(s.admin, c.id, { endDate: "2027-01-31", pendingMonthly: "1.000,00", unbilled: "", credits: "200", settleDays: "10", distratoClauses: buildDistratoClauses() });
    const d = await getContract(s.admin, c.id);
    expect(d.endDate).toBe("2027-01-31");
    expect(d.pendingMonthly).toBe(1000);
    expect(d.credits).toBe(200);
    expect(d.settleDays).toBe(10);
    await removeDistrato(s.admin, c.id);
    expect((await getContract(s.admin, c.id)).distratoClauses).toBeNull();
  });

  it("valida cláusulas, isola empresas e bloqueia operador", async () => {
    const a = await setupOrg();
    const b = await setupOrg();
    await expect(createContract(a.admin, form({ clauses: [] }))).rejects.toBeInstanceOf(ValidationError);
    const c = await createContract(a.admin, form());
    await expect(getContract(b.admin, c.id)).rejects.toThrow();
    await expect(listContracts(a.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
