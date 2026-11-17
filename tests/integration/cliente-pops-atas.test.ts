import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { createClientNote, deleteClientNote, listClientNotes, updateClientNote } from "@/server/services/client-notes";
import { copyProcedureToClient, createProcedure, listClientProcedures, listProcedures, getProcedure } from "@/server/services/procedures";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

const base = (extra: Record<string, unknown> = {}) => ({ legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [], ...extra });
const pop = (extra: Record<string, unknown> = {}) => ({ title: "Processo X", category: "OUTRAS", status: "PUBLICADO", content: "## Passos\n1. Fazer", ...extra });

describe("POP do cliente", () => {
  it("fica fora da lista geral e aparece só no cliente", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, base());
    await createProcedure(s.admin, pop({ title: "Geral" }));
    const mine = await createProcedure(s.admin, pop({ title: "Do cliente", clientId: c.id }));
    expect((await listProcedures(s.admin)).map((p) => p.title)).toEqual(["Geral"]);
    expect((await listClientProcedures(s.admin, c.id)).map((p) => p.title)).toEqual(["Do cliente"]);
    expect((await getProcedure(s.admin, mine.id)).client?.id).toBe(c.id);
  });
  it("copia um POP padrão como rascunho do cliente", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, base());
    const std = await createProcedure(s.admin, pop({ title: "Padrão" }));
    const copy = await copyProcedureToClient(s.admin, std.id, c.id);
    expect(copy).toMatchObject({ clientId: c.id, status: "RASCUNHO", title: "Padrão", content: std.content });
    await expect(copyProcedureToClient(s.admin, copy.id, c.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("particularidades e atas", () => {
  it("cria, edita, lista e remove", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, base({ responsibleOperatorId: s.op.userId, memberIds: [s.op.userId] }));
    const p = await createClientNote(s.op, c.id, { kind: "PARTICULARIDADE", title: "Aprova às quintas", content: "- Só aprova pagamentos às quintas" });
    const a = await createClientNote(s.admin, c.id, { kind: "ATA", title: "Reunião mensal", meetingDate: "2026-11-10", participants: "Ana, Rosan", content: "## Decisões\n- Reduzir custos" });
    expect((await listClientNotes(s.admin, c.id, "ATA")).map((n) => n.title)).toEqual(["Reunião mensal"]);
    expect((await listClientNotes(s.admin, c.id, "PARTICULARIDADE"))[0]!.title).toBe("Aprova às quintas");
    await updateClientNote(s.op, p.id, { title: "Aprova às sextas", content: "- Só aprova às sextas" });
    expect((await listClientNotes(s.admin, c.id, "PARTICULARIDADE"))[0]!.title).toBe("Aprova às sextas");
    await expect(deleteClientNote(s.op, a.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteClientNote(s.admin, a.id);
    expect(await prisma.clientNote.count({ where: { clientId: c.id } })).toBe(1);
  });
  it("ata exige data", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, base());
    await expect(createClientNote(s.admin, c.id, { kind: "ATA", title: "Sem data", content: "texto aqui" })).rejects.toThrow();
  });
});
