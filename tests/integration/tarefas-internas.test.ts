import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "@/domain/permissions";
import { createClient } from "@/server/services/clients";
import { assertTaskAccess } from "@/server/services/access";
import { createTask, listTasks, transitionTask } from "@/server/services/tasks";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

const task = (extra: Record<string, unknown> = {}) => ({ title: "Postar no Instagram", category: "OUTRAS", priority: "NORMAL", dueDate: "2026-12-10", dueTime: "18:00", checklist: [], ...extra });

describe("tarefas internas (sem cliente)", () => {
  it("cria sem cliente e só quem criou ou executa vê", async () => {
    const s = await setupOrg();
    const mine = await createTask(s.op, task({ clientId: "interna" }));
    expect(mine.clientId).toBeNull();
    const other = await createTask(s.admin, task({ title: "Só do gestor", assigneeId: s.admin.userId }));
    expect((await listTasks(s.op, {})).rows.map((t) => t.title)).toEqual(["Postar no Instagram"]);
    await expect(assertTaskAccess(s.op, other.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listTasks(s.admin, {})).rows).toHaveLength(2);
  });
  it("não aceita projeto nem pendência de cliente", async () => {
    const s = await setupOrg();
    const t = await createTask(s.admin, task());
    await expect(transitionTask(s.admin, t.id, "WAIT_CLIENT", { note: "aguardando" })).rejects.toThrow(/internas/);
  });
  it("tarefa de cliente continua exigindo vínculo", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [] });
    await expect(createTask(s.op, task({ clientId: c.id }))).rejects.toBeInstanceOf(NotFoundError);
  });
});
