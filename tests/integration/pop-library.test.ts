import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { POP_LIBRARY } from "@/domain/pop-library";
import { buildMindMap, parsePop } from "@/domain/pop-markup";
import { prisma } from "@/server/db";
import { importPopLibrary } from "@/server/services/procedures";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

describe("biblioteca de POPs", () => {
  it("importa uma vez e não duplica", async () => {
    const s = await setupOrg();
    const r1 = await importPopLibrary(s.admin);
    expect(r1.created).toBe(POP_LIBRARY.length);
    const r2 = await importPopLibrary(s.admin);
    expect(r2.created).toBe(0);
    expect(await prisma.procedure.count({ where: { organizationId: s.admin.organizationId, status: "PUBLICADO" } })).toBe(POP_LIBRARY.length);
  });
  it("operador não importa", async () => {
    const s = await setupOrg();
    await expect(importPopLibrary(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
  it("todos os POPs geram documento e mapa mental", () => {
    for (const p of POP_LIBRARY) {
      const blocks = parsePop(p.content);
      expect(blocks.length, p.title).toBeGreaterThan(3);
      expect(buildMindMap(p.title, blocks).children.length, p.title).toBeGreaterThan(1);
    }
  });
});
