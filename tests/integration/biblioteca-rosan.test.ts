import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { allowedSections, listSharedMessages, resetSystemMessage, saveAccess, saveSharedMessage, saveSystemMessage, systemMessagesFor, journeyOverview } from "@/server/services/library";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

describe("Biblioteca Rosan", () => {
  it("administradora escolhe o que cada pessoa vê; admin sempre vê tudo", async () => {
    const s = await setupOrg();
    expect(await allowedSections(s.admin)).toContain("materiais");
    expect(await allowedSections(s.op)).toEqual(["trilha", "cultura", "pops"]);
    await saveAccess(s.admin, s.op.userId, ["jornada", "mensagens"]);
    expect(await allowedSections(s.op)).toEqual(["jornada", "mensagens"]);
    await expect(saveAccess(s.op, s.op.userId, ["materiais"])).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("só a administradora altera mensagens; dá para voltar ao original", async () => {
    const s = await setupOrg();
    await saveSystemMessage(s.admin, "sys-frio", { title: "Novo título", body: "Texto novo {nome}" });
    const edited = (await systemMessagesFor(s.admin.organizationId)).find((m) => m.id === "sys-frio")!;
    expect(edited.body).toBe("Texto novo {nome}");
    expect(edited.edited).toBe(true);
    await expect(saveSystemMessage(s.op, "sys-frio", { title: "x", body: "y" })).rejects.toBeInstanceOf(ForbiddenError);
    await resetSystemMessage(s.admin, "sys-frio");
    expect((await systemMessagesFor(s.admin.organizationId)).find((m) => m.id === "sys-frio")!.edited).toBe(false);
    await saveSharedMessage(s.admin, null, { title: "Boas-vindas", body: "Oi!" });
    expect(await listSharedMessages(s.admin)).toHaveLength(1);
  });

  it("jornada traz esteiras por etapa com prazo total", async () => {
    const s = await setupOrg();
    const j = await journeyOverview(s.admin);
    const com = j.find((x) => x.stage === "COMERCIAL")!;
    expect(com.esteiras[0].totalDays).toBeGreaterThan(0);
  });
});
