import { beforeEach, describe, expect, it } from "vitest";
import { ESTEIRAS, esteiraCounts, getEsteira } from "@/domain/esteiras";
import { weekday } from "@/domain/dates";
import { ForbiddenError, ValidationError } from "@/domain/permissions";
import { TEMPLATE_LIBRARY } from "@/domain/template-library";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { applyEsteira, esteiraProgress } from "@/server/services/esteiras";
import { createTemplate, getTemplate, importTemplateLibrary, listTemplates } from "@/server/services/templates";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

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
  return { ...s, client };
}

describe("catálogo de esteiras", () => {
  it("tem 9 esteiras com etapas, tarefas e checklist", () => {
    expect(ESTEIRAS).toHaveLength(9);
    for (const e of ESTEIRAS) {
      const c = esteiraCounts(e);
      expect(c.stages).toBeGreaterThanOrEqual(2);
      expect(c.tasks).toBeGreaterThanOrEqual(6);
      for (const t of e.stages.flatMap((s) => s.tasks)) expect(t.items.length).toBeGreaterThan(0);
    }
    expect(new Set(ESTEIRAS.map((e) => e.slug)).size).toBe(9);
  });

  it("biblioteca de modelos não repete nomes", () => {
    expect(new Set(TEMPLATE_LIBRARY.map((t) => t.name)).size).toBe(TEMPLATE_LIBRARY.length);
  });
});

describe("aplicar esteira ao cliente", () => {
  it("cria tarefas com checklist, prazo em dia útil e projeto", async () => {
    const s = await scenario();
    const e = getEsteira("onboarding")!;
    const all = e.stages.flatMap((st, si) => st.tasks.map((_, ti) => `${si}.${ti}`));
    const r = await applyEsteira(s.admin, { slug: "onboarding", clientId: s.client.id, startDate: "2026-11-14", ownerId: s.op.userId, keys: all, createProject: "on" });
    expect(r.created).toBe(esteiraCounts(e).tasks);
    expect(r.projectId).toBeTruthy();
    const tasks = await prisma.task.findMany({ where: { clientId: s.client.id }, include: { checklistItems: true } });
    expect(tasks).toHaveLength(r.created);
    expect(tasks.every((t) => t.projectId === r.projectId && t.assigneeId === s.op.userId && t.journeyKey?.startsWith("onboarding:"))).toBe(true);
    expect(tasks.every((t) => t.checklistItems.length > 0)).toBe(true);
    // nenhuma tarefa cai em fim de semana
    for (const t of tasks) {
      const w = weekday(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(t.dueAt));
      expect([0, 6]).not.toContain(w);
    }
  });

  it("aplica só as tarefas marcadas, sem projeto, e não duplica", async () => {
    const s = await scenario();
    const input = { slug: "implantacao", clientId: s.client.id, startDate: "2026-11-16", keys: ["0.0", "0.1"], createProject: "" };
    const r1 = await applyEsteira(s.admin, input);
    expect(r1).toMatchObject({ created: 2, skipped: 0, projectId: null });
    await expect(applyEsteira(s.admin, input)).rejects.toBeInstanceOf(ValidationError);
    const r2 = await applyEsteira(s.admin, { ...input, keys: ["0.0", "0.1", "0.2"] });
    expect(r2).toMatchObject({ created: 1, skipped: 2 });
    expect(await prisma.task.count({ where: { clientId: s.client.id } })).toBe(3);
  });

  it("exige tarefa marcada, esteira válida e permissão", async () => {
    const s = await scenario();
    await expect(applyEsteira(s.admin, { slug: "onboarding", clientId: s.client.id, startDate: "2026-11-16", keys: [] })).rejects.toBeInstanceOf(ValidationError);
    await expect(applyEsteira(s.admin, { slug: "nao-existe", clientId: s.client.id, startDate: "2026-11-16", keys: ["0.0"] })).rejects.toThrow();
    await expect(applyEsteira(s.op, { slug: "onboarding", clientId: s.client.id, startDate: "2026-11-16", keys: ["0.0"] })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("mostra o andamento por cliente", async () => {
    const s = await scenario();
    await applyEsteira(s.admin, { slug: "onboarding", clientId: s.client.id, startDate: "2026-11-16", keys: ["0.0", "0.1"] });
    const task = await prisma.task.findFirstOrThrow({ where: { clientId: s.client.id } });
    await prisma.task.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    const p = await esteiraProgress(s.admin);
    expect(p.onboarding?.clients[0]).toMatchObject({ name: "Cliente", total: 2, done: 1 });
  });
});

describe("modelos: etapa e biblioteca", () => {
  it("guarda a etapa do modelo", async () => {
    const s = await scenario();
    const t = await createTemplate(s.admin, {
      name: "Kick-off", title: "Kick-off", category: "REUNIAO_CLIENTE", priority: "NORMAL", competenceRule: "NONE",
      frequency: "MONTHLY_DAY", monthDays: ["5"], dueTime: "18:00", leadDays: "0", startOffsetDays: "0", nonBusinessDayRule: "POSTPONE", stage: "ONBOARDING",
    });
    expect((await getTemplate(s.admin, t.id)).stage).toBe("ONBOARDING");
  });

  it("importa a biblioteca uma vez e só para quem edita modelos", async () => {
    const s = await scenario();
    await expect(importTemplateLibrary(s.gestor)).rejects.toBeInstanceOf(ForbiddenError);
    const r1 = await importTemplateLibrary(s.admin);
    expect(r1.created).toBe(TEMPLATE_LIBRARY.length);
    const r2 = await importTemplateLibrary(s.admin);
    expect(r2).toMatchObject({ created: 0 });
    const list = await listTemplates(s.admin);
    expect(list).toHaveLength(TEMPLATE_LIBRARY.length);
    expect(list.every((t) => t.stage && t._count.checklistItems > 0)).toBe(true);
  });
});
