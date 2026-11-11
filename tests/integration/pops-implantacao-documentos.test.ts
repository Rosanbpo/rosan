import { beforeEach, describe, expect, it } from "vitest";
import { instantToLocalDate, weekday } from "@/domain/dates";
import { IMPLANTATION_STEPS } from "@/domain/implantation";
import { ForbiddenError, ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import {
  addRequirement,
  applyDefaultRequirements,
  documentsOverview,
  getDocumentChecklist,
  removeRequirement,
  setReceived,
} from "@/server/services/documents";
import { createProcedure, getProcedure } from "@/server/services/procedures";
import { createImplantationProject, getProject } from "@/server/services/projects";
import { createTemplate, getTemplate, updateTemplate } from "@/server/services/templates";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);
const today = () => instantToLocalDate(new Date(), "America/Sao_Paulo");

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

const templateInput = (extra: Record<string, unknown> = {}) => ({
  name: "Conciliação",
  title: "Conciliar",
  category: "CONCILIACAO_BANCARIA",
  priority: "NORMAL",
  competenceRule: "NONE",
  frequency: "MONTHLY_DAY",
  monthDays: ["5"],
  dueTime: "18:00",
  leadDays: "0",
  startOffsetDays: "0",
  nonBusinessDayRule: "POSTPONE",
  ...extra,
});

describe("POP vinculado à rotina", () => {
  it("vincula, troca e aparece no POP; rejeita POP de outra empresa", async () => {
    const s = await scenario();
    const pop = await createProcedure(s.gestor, { title: "Conciliação diária", category: "CONCILIACAO_BANCARIA", status: "PUBLICADO", content: "1. Baixar extrato" });
    const tpl = await createTemplate(s.admin, templateInput({ procedureId: pop.id }));
    expect((await getTemplate(s.admin, tpl.id)).procedure?.id).toBe(pop.id);
    expect((await getProcedure(s.gestor, pop.id)).templates.map((t) => t.id)).toEqual([tpl.id]);

    await updateTemplate(s.admin, tpl.id, templateInput({ procedureId: "" }));
    expect((await getTemplate(s.admin, tpl.id)).procedure).toBeNull();

    const other = await setupOrg();
    const foreign = await createProcedure(other.gestor, { title: "Outro", category: "OUTRAS", status: "PUBLICADO", content: "1. Passo de outra empresa" });
    await expect(createTemplate(s.admin, templateInput({ procedureId: foreign.id }))).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("projeto de implantação", () => {
  it("cria o projeto com todas as tarefas em dias úteis e impede duplicar", async () => {
    const s = await scenario();
    const project = await createImplantationProject(s.gestor, { clientId: s.client.id, startDate: today(), ownerId: s.op.userId });
    const detail = await getProject(s.gestor, project.id);
    expect(detail.project.name).toContain("Implantação");
    expect(detail.project.status).toBe("EM_ANDAMENTO");
    expect(detail.tasks).toHaveLength(IMPLANTATION_STEPS.length);
    const tasks = await prisma.task.findMany({ where: { projectId: project.id } });
    expect(tasks.every((t) => t.assigneeId === s.op.userId && t.clientId === s.client.id)).toBe(true);
    for (const t of tasks) {
      const local = instantToLocalDate(t.dueAt, "America/Sao_Paulo");
      expect([0, 6]).not.toContain(weekday(local));
    }
    await expect(createImplantationProject(s.gestor, { clientId: s.client.id, startDate: today() })).rejects.toBeInstanceOf(ValidationError);
  });

  it("operador não cria implantação", async () => {
    const s = await scenario();
    await expect(createImplantationProject(s.op, { clientId: s.client.id, startDate: today() })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("documentos por competência", () => {
  it("monta a lista, marca recebimento por mês e mostra o que falta", async () => {
    const s = await scenario();
    expect(await applyDefaultRequirements(s.admin, s.client.id)).toBeGreaterThan(0);
    expect(await applyDefaultRequirements(s.admin, s.client.id)).toBe(0);
    await addRequirement(s.admin, s.client.id, "Extrato Sicredi", true);
    await expect(addRequirement(s.admin, s.client.id, "extrato sicredi", true)).rejects.toBeInstanceOf(ValidationError);

    const list = await getDocumentChecklist(s.op, s.client.id, "2026-10");
    const required = list.filter((d) => d.required);
    await setReceived(s.op, required[0].id, "2026-10", true);
    await setReceived(s.op, required[0].id, "2026-10", true); // idempotente
    expect((await getDocumentChecklist(s.op, s.client.id, "2026-10"))[0].receivedAt).not.toBeNull();
    expect((await getDocumentChecklist(s.op, s.client.id, "2026-11"))[0].receivedAt).toBeNull();

    const row = (await documentsOverview(s.gestor, "2026-10")).find((r) => r.id === s.client.id)!;
    expect(row.receivedCount).toBe(1);
    expect(row.requiredCount).toBe(required.length);
    expect(row.missing).not.toContain(required[0].name);

    await setReceived(s.op, required[0].id, "2026-10", false);
    expect((await documentsOverview(s.gestor, "2026-10")).find((r) => r.id === s.client.id)!.receivedCount).toBe(0);
  });

  it("operador marca recebimento mas não configura a lista; competência inválida é rejeitada", async () => {
    const s = await scenario();
    await applyDefaultRequirements(s.admin, s.client.id);
    const [first] = await getDocumentChecklist(s.op, s.client.id, "2026-10");
    await expect(removeRequirement(s.op, first.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addRequirement(s.op, s.client.id, "X", true)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setReceived(s.op, first.id, "2026-13", true)).rejects.toBeInstanceOf(ValidationError);
    await removeRequirement(s.admin, first.id);
    expect((await getDocumentChecklist(s.op, s.client.id, "2026-10")).some((d) => d.id === first.id)).toBe(false);
  });

  it("não enxerga documentos de cliente de outra empresa", async () => {
    const s = await scenario();
    const other = await setupOrg();
    await expect(getDocumentChecklist(other.admin, s.client.id, "2026-10")).rejects.toThrow();
  });
});
