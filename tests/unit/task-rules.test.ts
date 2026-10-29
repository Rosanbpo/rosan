import { describe, expect, it } from "vitest";
import { can, seesAllClients } from "@/domain/permissions";
import {
  actionForTarget,
  availableActions,
  checkTransition,
  completedOnTime,
  isOverdue,
  type TaskSnapshot,
} from "@/domain/task-rules";

const op = { userId: "op", role: "OPERADOR" as const };
const op2 = { userId: "op2", role: "OPERADOR" as const };
const rev = { userId: "rev", role: "OPERADOR" as const };
const gestor = { userId: "g", role: "GESTOR" as const };
const admin = { userId: "a", role: "ADMIN" as const };

const task = (t: Partial<TaskSnapshot> = {}): TaskSnapshot => ({
  status: "A_FAZER",
  assigneeId: "op",
  reviewerId: null,
  requiresEvidence: false,
  checklist: [],
  evidenceCount: 0,
  ...t,
});

describe("atraso calculado", () => {
  const now = new Date("2026-05-10T12:00:00Z");
  it("tarefa aberta com prazo vencido está atrasada", () => {
    expect(isOverdue({ status: "EM_ANDAMENTO", dueAt: new Date("2026-05-10T11:59:00Z") }, now)).toBe(true);
    expect(isOverdue({ status: "AGUARDANDO_CLIENTE", dueAt: new Date("2026-05-01T00:00:00Z") }, now)).toBe(true);
  });
  it("concluídas e canceladas nunca aparecem como atrasadas", () => {
    expect(isOverdue({ status: "CONCLUIDA", dueAt: new Date("2026-01-01") }, now)).toBe(false);
    expect(isOverdue({ status: "CANCELADA", dueAt: new Date("2026-01-01") }, now)).toBe(false);
  });
  it("prazo futuro não está atrasado", () => {
    expect(isOverdue({ status: "A_FAZER", dueAt: new Date("2026-05-10T12:01:00Z") }, now)).toBe(false);
  });
  it("entrega no prazo compara conclusão com prazo", () => {
    const dueAt = new Date("2026-05-10T21:00:00Z");
    expect(completedOnTime({ completedAt: new Date("2026-05-10T21:00:00Z"), dueAt })).toBe(true);
    expect(completedOnTime({ completedAt: new Date("2026-05-10T21:00:01Z"), dueAt })).toBe(false);
  });
});

describe("transições de status", () => {
  it("operador inicia e conclui tarefa própria sem revisor", () => {
    expect(checkTransition(task(), "START", op)).toEqual({ ok: true, to: "EM_ANDAMENTO" });
    expect(checkTransition(task({ status: "EM_ANDAMENTO" }), "COMPLETE", op)).toEqual({ ok: true, to: "CONCLUIDA" });
  });

  it("operador não movimenta tarefa de outro operador", () => {
    const res = checkTransition(task(), "START", op2);
    expect(res.ok).toBe(false);
  });

  it("operador pode assumir tarefa sem responsável ao iniciar", () => {
    expect(checkTransition(task({ assigneeId: null }), "START", op2).ok).toBe(true);
    expect(checkTransition(task({ assigneeId: null, status: "EM_ANDAMENTO" }), "COMPLETE", op2).ok).toBe(false);
  });

  it("exige motivo e data de acompanhamento para aguardar cliente/terceiro", () => {
    const t = task({ status: "EM_ANDAMENTO" });
    expect(checkTransition(t, "WAIT_CLIENT", op, {}).ok).toBe(false);
    expect(checkTransition(t, "WAIT_CLIENT", op, { note: "Extrato de março" }).ok).toBe(false);
    expect(
      checkTransition(t, "WAIT_CLIENT", op, { note: "Extrato de março", followUpDate: "2026-05-01", today: "2026-05-02" }).ok,
    ).toBe(false);
    expect(
      checkTransition(t, "WAIT_THIRD", op, { note: "Retorno do banco", followUpDate: "2026-05-03", today: "2026-05-02" }),
    ).toEqual({ ok: true, to: "AGUARDANDO_TERCEIRO" });
  });

  it("com revisor, não é possível concluir diretamente", () => {
    const t = task({ status: "EM_ANDAMENTO", reviewerId: "rev" });
    const res = checkTransition(t, "COMPLETE", op);
    expect(res.ok).toBe(false);
    expect(checkTransition(t, "SUBMIT_REVIEW", op)).toEqual({ ok: true, to: "EM_REVISAO" });
  });

  it("revisor aprova; executor não aprova a própria entrega", () => {
    const t = task({ status: "EM_REVISAO", reviewerId: "rev" });
    expect(checkTransition(t, "APPROVE", rev)).toEqual({ ok: true, to: "CONCLUIDA" });
    expect(checkTransition(t, "APPROVE", op).ok).toBe(false);
    expect(checkTransition(t, "APPROVE", op2).ok).toBe(false);
    expect(checkTransition(t, "APPROVE", gestor).ok).toBe(true);
  });

  it("devolução exige justificativa e volta para em andamento", () => {
    const t = task({ status: "EM_REVISAO", reviewerId: "rev" });
    expect(checkTransition(t, "RETURN", rev, {}).ok).toBe(false);
    expect(checkTransition(t, "RETURN", rev, { note: "Faltou o extrato do Banco B" })).toEqual({
      ok: true,
      to: "EM_ANDAMENTO",
    });
  });

  it("checklist obrigatório e evidência bloqueiam conclusão e envio para revisão", () => {
    const t = task({
      status: "EM_ANDAMENTO",
      requiresEvidence: true,
      checklist: [
        { required: true, done: false },
        { required: false, done: false },
      ],
    });
    const res = checkTransition(t, "COMPLETE", op);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/checklist/);
      expect(res.error).toMatch(/evidência/);
    }
    const ok = checkTransition(
      { ...t, checklist: [{ required: true, done: true }, { required: false, done: false }], evidenceCount: 1 },
      "COMPLETE",
      op,
    );
    expect(ok.ok).toBe(true);
    expect(checkTransition({ ...t, reviewerId: "rev" }, "SUBMIT_REVIEW", op).ok).toBe(false);
  });

  it("apenas gestores reabrem e cancelam, com justificativa", () => {
    const done = task({ status: "CONCLUIDA" });
    expect(checkTransition(done, "REOPEN", op, { note: "Erro na conciliação" }).ok).toBe(false);
    expect(checkTransition(done, "REOPEN", gestor, {}).ok).toBe(false);
    expect(checkTransition(done, "REOPEN", gestor, { note: "Erro na conciliação" })).toEqual({ ok: true, to: "EM_ANDAMENTO" });
    expect(checkTransition(task({ status: "CANCELADA" }), "REOPEN", admin, { note: "Cancelada por engano" })).toEqual({
      ok: true,
      to: "A_FAZER",
    });
    expect(checkTransition(task(), "CANCEL", op, { note: "Não se aplica" }).ok).toBe(false);
  });

  it("bloqueia transições a partir de status inválidos", () => {
    expect(checkTransition(task({ status: "CONCLUIDA" }), "START", gestor).ok).toBe(false);
    expect(checkTransition(task({ status: "A_FAZER" }), "APPROVE", gestor).ok).toBe(false);
    expect(checkTransition(task({ status: "CANCELADA" }), "COMPLETE", admin).ok).toBe(false);
  });

  it("Kanban mapeia o destino para a mesma ação validada", () => {
    expect(actionForTarget("A_FAZER", "EM_ANDAMENTO")).toBe("START");
    expect(actionForTarget("EM_REVISAO", "CONCLUIDA")).toBe("APPROVE");
    expect(actionForTarget("EM_ANDAMENTO", "CONCLUIDA")).toBe("COMPLETE");
    expect(actionForTarget("EM_REVISAO", "EM_ANDAMENTO")).toBe("RETURN");
    expect(actionForTarget("CONCLUIDA", "EM_ANDAMENTO")).toBe("REOPEN");
    expect(actionForTarget("AGUARDANDO_CLIENTE", "EM_ANDAMENTO")).toBe("RESUME");
    expect(actionForTarget("EM_REVISAO", "A_FAZER")).toBeNull();
  });

  it("ações disponíveis orientam o usuário", () => {
    expect(availableActions(task({ status: "EM_ANDAMENTO", reviewerId: "rev" }), op)).toEqual(
      expect.arrayContaining(["SUBMIT_REVIEW", "WAIT_CLIENT", "WAIT_THIRD", "TO_TODO"]),
    );
    expect(availableActions(task({ status: "EM_ANDAMENTO", reviewerId: "rev" }), op)).not.toContain("COMPLETE");
    expect(availableActions(task({ status: "EM_REVISAO", reviewerId: "rev" }), rev)).toEqual(["APPROVE", "RETURN"]);
  });
});

describe("matriz de permissões", () => {
  it("define o que cada papel pode fazer", () => {
    expect(can({ role: "ADMIN" }, "users.manage")).toBe(true);
    expect(can({ role: "GESTOR" }, "users.manage")).toBe(false);
    expect(can({ role: "GESTOR" }, "recurrences.manage")).toBe(true);
    expect(can({ role: "GESTOR" }, "templates.manage")).toBe(false);
    expect(can({ role: "OPERADOR" }, "dashboard.view")).toBe(false);
    expect(can({ role: "OPERADOR" }, "tasks.plan")).toBe(false);
    expect(seesAllClients({ role: "ADMIN" })).toBe(true);
    expect(seesAllClients({ role: "GESTOR" })).toBe(false);
  });
});
