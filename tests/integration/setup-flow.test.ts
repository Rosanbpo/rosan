import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { needsFirstSetup, performFirstSetup } from "@/server/services/setup";
import { resetDb } from "./helpers";

beforeEach(resetDb);

describe("primeiro acesso", () => {
  const input = { orgName: "BPO Teste", name: "Admin Teste", email: "Admin@Teste.test", password: "senha-forte-123" };

  it("cria empresa, administrador, modelos e feriados apenas uma vez", async () => {
    expect(await needsFirstSetup()).toBe(true);
    await performFirstSetup(input);
    expect(await needsFirstSetup()).toBe(false);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "admin@teste.test" }, include: { memberships: true } });
    expect(user.memberships[0].role).toBe("ADMIN");
    expect(await prisma.routineTemplate.count()).toBe(9);
    expect(await prisma.holiday.count()).toBe(20);
    await expect(performFirstSetup({ ...input, email: "outro@teste.test" })).rejects.toThrow(/já foi feita/);
    expect(await prisma.user.count()).toBe(1);
  });

  it("execuções simultâneas criam um único administrador", async () => {
    const results = await Promise.allSettled([
      performFirstSetup(input),
      performFirstSetup({ ...input, email: "b@teste.test" }),
      performFirstSetup({ ...input, email: "c@teste.test" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.organization.count()).toBe(1);
  });

  it("valida a senha", async () => {
    await expect(performFirstSetup({ ...input, password: "curta" })).rejects.toThrow(/10 caracteres/);
  });
});
