import { beforeEach, describe, expect, it } from "vitest";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { prisma } from "@/server/db";
import { createClient, getClient, listClients, updateClient } from "@/server/services/clients";
import {
  addChecklistItem,
  addEvidence,
  createTask,
  getTaskDetail,
  listTasks,
  toggleChecklistItem,
  transitionTask,
  updateTask,
} from "@/server/services/tasks";
import { listPendings } from "@/server/services/pendings";
import { createTemplate } from "@/server/services/templates";
import { createRecurrence } from "@/server/services/recurrences";
import { resetDb, setupOrg } from "./helpers";

const future = (days: number) => instantToLocalDate(new Date(Date.now() + days * 86_400_000), "America/Sao_Paulo");

beforeEach(resetDb);

async function scenario() {
  const s = await setupOrg();
  const client = await createClient(s.admin, {
    legalName: "Empresa Fictícia Ltda",
    tradeName: "Fictícia",
    status: "ATIVO",
    services: ["Conciliação bancária"],
    responsibleOperatorId: s.op.userId,
    managerId: s.gestor.userId,
    memberIds: [],
  });
  return { ...s, client };
}

describe("1. cadastro de cliente e vínculos", () => {
  it("cadastra cliente vinculando operador responsável e gestor", async () => {
    const { client, op, gestor, op2 } = await scenario();
    const members = await prisma.clientMember.findMany({ where: { clientId: client.id } });
    expect(members.map((m) => m.userId).sort()).toEqual([op.userId, gestor.userId].sort());
    expect((await listClients(op)).total).toBe(1);
    expect((await listClients(op2)).total).toBe(0);
    const audit = await prisma.auditEvent.findMany({ where: { clientId: client.id } });
    expect(audit.map((a) => a.action)).toContain("client.created");
  });

  it("valida CNPJ, gestor e permissões no servidor", async () => {
    const { admin, gestor, op } = await scenario();
    await expect(
      createClient(admin, { legalName: "X Ltda", tradeName: "Teste X", status: "ATIVO", cnpj: "11.111.111/1111-11" }),
    ).rejects.toThrow(/CNPJ/);
    await expect(
      createClient(admin, { legalName: "X Ltda", tradeName: "Teste X", status: "ATIVO", managerId: op.userId }),
    ).rejects.toThrow(/gestor/);
    await expect(createClient(gestor, { legalName: "X Ltda", tradeName: "Teste X", status: "ATIVO" })).rejects.toThrow(/permissão/);
  });
});

describe("2. tarefa com checklist", () => {
  it("cria tarefa com checklist, prazo no fuso de São Paulo e auditoria", async () => {
    const { gestor, client, op } = await scenario();
    const task = await createTask(gestor, {
      clientId: client.id,
      title: "Conciliar extratos",
      category: "CONCILIACAO_BANCARIA",
      priority: "ALTA",
      assigneeId: op.userId,
      dueDate: "2030-03-15",
      dueTime: "18:00",
      checklist: [
        { label: "Baixar extratos", required: true },
        { label: "Anotar divergências", required: false },
      ],
    });
    expect(task.dueAt.toISOString()).toBe("2030-03-15T21:00:00.000Z");
    const detail = await getTaskDetail(gestor, task.id);
    expect(detail.checklistItems.map((c) => [c.label, c.required])).toEqual([
      ["Baixar extratos", true],
      ["Anotar divergências", false],
    ]);
    expect(detail.auditEvents[0].action).toBe("task.created");
    expect(detail.origin).toBe("MANUAL");
  });

  it("operador cria apenas para si e não altera prazo", async () => {
    const { op, op2, client } = await scenario();
    await expect(
      createTask(op, { clientId: client.id, title: "Teste", category: "OUTRAS", assigneeId: op2.userId, dueDate: future(3), dueTime: "10:00" }),
    ).rejects.toThrow(/para si/);
    const t = await createTask(op, { clientId: client.id, title: "Minha tarefa", category: "OUTRAS", dueDate: future(3), dueTime: "10:00" });
    expect(t.assigneeId).toBe(op.userId);
    await expect(
      updateTask(op, t.id, { title: "Minha tarefa", category: "OUTRAS", priority: "NORMAL", dueDate: future(9), dueTime: "10:00" }),
    ).rejects.toThrow(/gestores/);
  });
});

describe("4–8. pendência, revisão, devolução, conclusão e reabertura", () => {
  it("percorre o fluxo completo preservando o histórico", async () => {
    const { gestor, op, client } = await scenario();
    const task = await createTask(gestor, {
      clientId: client.id,
      title: "Fechamento",
      category: "FECHAMENTO_MENSAL",
      assigneeId: op.userId,
      reviewerId: gestor.userId,
      requiresEvidence: "on",
      dueDate: future(5),
      dueTime: "18:00",
      checklist: [{ label: "Conciliar contas", required: true }],
    });

    await transitionTask(op, task.id, "START");

    // 4. pendência com motivo e próximo acompanhamento
    await expect(transitionTask(op, task.id, "WAIT_CLIENT", { note: "Extrato" })).rejects.toThrow(/acompanhamento/);
    await transitionTask(op, task.id, "WAIT_CLIENT", { note: "Extrato do banco B", followUpDate: future(2), respondent: "Financeiro" });
    const pendings = await listPendings(gestor);
    expect(pendings.total).toBe(1);
    expect(pendings.rows[0]).toMatchObject({ reason: "Extrato do banco B", respondent: "Financeiro", type: "CLIENTE" });
    await transitionTask(op, task.id, "RESUME", { note: "Cliente enviou" });
    expect((await listPendings(gestor)).total).toBe(0);

    // 7. exigências bloqueiam envio para revisão
    await expect(transitionTask(op, task.id, "SUBMIT_REVIEW")).rejects.toThrow(/checklist/);
    const detail = await getTaskDetail(op, task.id);
    await toggleChecklistItem(op, detail.checklistItems[0].id, true);
    await expect(transitionTask(op, task.id, "SUBMIT_REVIEW")).rejects.toThrow(/evidência/);
    await addEvidence(op, task.id, "https://exemplo.test/relatorio");
    await expect(transitionTask(op, task.id, "COMPLETE")).rejects.toThrow(/revisão/);

    // 5. encaminhar para revisão
    await transitionTask(op, task.id, "SUBMIT_REVIEW");
    await expect(transitionTask(op, task.id, "APPROVE")).rejects.toThrow();

    // 6. devolver com justificativa
    await expect(transitionTask(gestor, task.id, "RETURN", {})).rejects.toThrow(/justificativa/);
    await transitionTask(gestor, task.id, "RETURN", { note: "Faltou anexar o razão" });
    let t = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(t).toMatchObject({ status: "EM_ANDAMENTO", returnCount: 1, lastReturnReason: "Faltou anexar o razão" });

    // 7. concluir com aprovação, registrando executor e revisor
    await transitionTask(op, task.id, "SUBMIT_REVIEW");
    await transitionTask(gestor, task.id, "APPROVE");
    t = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(t).toMatchObject({ status: "CONCLUIDA", executedById: op.userId, reviewedById: gestor.userId });
    expect(t.completedAt).not.toBeNull();

    // 8. reabrir com justificativa preservando o histórico
    await expect(transitionTask(op, task.id, "REOPEN", { note: "Erro" })).rejects.toThrow();
    await transitionTask(gestor, task.id, "REOPEN", { note: "Cliente apontou erro no saldo" });
    t = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(t.status).toBe("EM_ANDAMENTO");
    expect(t.completedAt).toBeNull();
    const audit = await prisma.auditEvent.findMany({ where: { taskId: task.id }, orderBy: { createdAt: "asc" } });
    const actions = audit.map((a) => a.action);
    for (const a of ["task.created", "task.wait_client", "task.resume", "task.submit_review", "task.return", "task.approve", "task.reopen"]) {
      expect(actions).toContain(a);
    }
    expect(audit.every((a) => a.actorId)).toBe(true);
  });

  it("conclusão sem revisor exige checklist obrigatório", async () => {
    const { op, client } = await scenario();
    const t = await createTask(op, { clientId: client.id, title: "Simples", category: "OUTRAS", dueDate: future(1), dueTime: "10:00" });
    await addChecklistItem(op, t.id, "Passo opcional", false);
    await transitionTask(op, t.id, "START");
    await transitionTask(op, t.id, "COMPLETE");
    expect((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).completedById).toBe(op.userId);
  });
});

describe("9. isolamento entre empresas e clientes", () => {
  it("bloqueia acesso a clientes de outra empresa e a clientes sem vínculo", async () => {
    const a = await scenario();
    const other = await setupOrg();
    const foreignClient = await createClient(other.admin, { legalName: "Outra Ltda", tradeName: "Outra", status: "ATIVO" });
    const task = await createTask(a.gestor, { clientId: a.client.id, title: "Interna", category: "OUTRAS", dueDate: future(2), dueTime: "10:00" });

    // Outra empresa (mesmo sendo administrador) não enxerga nada
    await expect(getClient(other.admin, a.client.id)).rejects.toThrow(/não encontrado/);
    await expect(getTaskDetail(other.admin, task.id)).rejects.toThrow(/não encontrada/);
    await expect(transitionTask(other.admin, task.id, "START")).rejects.toThrow();
    expect((await listTasks(other.admin)).total).toBe(0);
    await expect(createTask(a.admin, { clientId: foreignClient.id, title: "x", category: "OUTRAS", dueDate: future(1), dueTime: "10:00" })).rejects.toThrow();

    // Operador sem vínculo com o cliente
    await expect(getTaskDetail(a.op2, task.id)).rejects.toThrow();
    expect((await listTasks(a.op2)).total).toBe(0);
    // Não é possível atribuir a usuário sem vínculo ou de outra empresa
    await expect(updateTask(a.gestor, task.id, { title: "Interna", category: "OUTRAS", priority: "NORMAL", dueDate: future(2), dueTime: "10:00", assigneeId: a.op2.userId })).rejects.toThrow(/vinculado/);
    await expect(updateTask(a.gestor, task.id, { title: "Interna", category: "OUTRAS", priority: "NORMAL", dueDate: future(2), dueTime: "10:00", assigneeId: other.op.userId })).rejects.toThrow(/pertence/);

    // Após vincular, o operador passa a ter acesso
    await updateClient(a.admin, a.client.id, {
      legalName: "Empresa Fictícia Ltda",
      tradeName: "Fictícia",
      status: "ATIVO",
      responsibleOperatorId: a.op.userId,
      managerId: a.gestor.userId,
      memberIds: [a.op2.userId],
    });
    expect((await listTasks(a.op2)).total).toBe(1);
    // ...mas não movimenta tarefa de outro responsável
    await transitionTask(a.gestor, task.id, "START");
    await expect(transitionTask(a.op2, task.id, "COMPLETE")).rejects.toThrow(/responsabilidade/);
  });

  it("gestor não acessa recorrências de clientes fora da sua gestão", async () => {
    const a = await scenario();
    const otherGestor = await prisma.membership.create({
      data: { userId: (await prisma.user.create({ data: { name: "G2", email: "g2@teste.test", passwordHash: "x" } })).id, organizationId: a.org.id, role: "GESTOR" },
    });
    const tpl = await createTemplate(a.admin, { name: "Modelo", title: "Modelo", category: "OUTRAS", priority: "NORMAL", competenceRule: "NONE", frequency: "MONTHLY_DAY", monthDays: ["5"], dueTime: "18:00", leadDays: "0", startOffsetDays: "0", nonBusinessDayRule: "POSTPONE" });
    await expect(
      createRecurrence(
        { userId: otherGestor.userId, organizationId: a.org.id, role: "GESTOR", name: "G2" },
        { clientId: a.client.id, templateId: tpl.id, startDate: "2030-01-01", frequency: "MONTHLY_DAY", monthDays: ["5"], dueTime: "18:00", leadDays: "0", startOffsetDays: "0", nonBusinessDayRule: "POSTPONE" },
      ),
    ).rejects.toThrow(/não encontrado/);
  });
});

describe("pendência: reagendamento", () => {
  it("permite reagendar o acompanhamento", async () => {
    const { op, client, gestor } = await scenario();
    const t = await createTask(op, { clientId: client.id, title: "Doc", category: "DOCUMENTACAO", dueDate: future(1), dueTime: "10:00" });
    await transitionTask(op, t.id, "WAIT_THIRD", { note: "Contador", followUpDate: future(1) });
    const p = (await listPendings(gestor)).rows[0];
    const { updatePendingFollowUp } = await import("@/server/services/pendings");
    await updatePendingFollowUp(op, p.id, { followUpDate: future(4) });
    const updated = await prisma.pending.findUniqueOrThrow({ where: { id: p.id } });
    expect(updated.followUpAt).toEqual(localDateToDbDate(future(4)));
  });
});
