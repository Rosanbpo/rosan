import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { deleteClient, createClient } from "@/server/services/clients";
import { quickAddRoutine } from "@/server/services/recurrences";
import { setupOrg } from "./helpers";

describe("excluir cliente", () => {
  it("exige a senha e apaga o cliente com tarefas e rotinas", async () => {
    const { org, admin } = await setupOrg();
    await prisma.user.update({ where: { id: admin.userId }, data: { passwordHash: await bcrypt.hash("senha-certa-1", 4) } });
    const actor = admin;
    const c = await createClient(actor, { legalName: "Cliente Teste", tradeName: "Cliente Teste", status: "ATIVO" });
    await quickAddRoutine(actor, { clientId: c.id, title: "Rotina", mode: "DAILY", dueTime: "12:00", checklist: [{ label: "a" }] });
    await expect(deleteClient(actor, c.id, "errada")).rejects.toThrow("Senha incorreta");
    expect(await prisma.client.count({ where: { id: c.id } })).toBe(1);
    await deleteClient(actor, c.id, "senha-certa-1");
    expect(await prisma.client.count({ where: { id: c.id } })).toBe(0);
    expect(await prisma.task.count({ where: { clientId: c.id } })).toBe(0);
  });
});
