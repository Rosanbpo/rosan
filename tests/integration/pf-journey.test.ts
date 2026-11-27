import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import { getPfJourney, listPfClients, savePfDates, setPfContinuity, setPfStatus, togglePfItem } from "@/server/services/pf-journey";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

async function pfClient(s: Awaited<ReturnType<typeof setupOrg>>, lines: string[] = ["CONSULTORIA_PF"]) {
  return createClient(s.admin, { legalName: "Maria Souza", tradeName: "Maria Souza", status: "ATIVO", services: [], serviceLines: lines, memberIds: [] });
}

describe("jornada da Consultoria PF", () => {
  it("cliente só BPO não tem jornada PF e não pode editá-la", async () => {
    const s = await setupOrg();
    const c = await pfClient(s, ["BPO_FINANCEIRO"]);
    expect(await getPfJourney(s.admin, c.id)).toBeNull();
    await expect(setPfStatus(s.admin, c.id, "AGUARDANDO_CONTRATACAO")).rejects.toBeInstanceOf(ValidationError);
  });

  it("começa em Novo interessado e calcula os prazos", async () => {
    const s = await setupOrg();
    const c = await pfClient(s);
    const j = await getPfJourney(s.admin, c.id);
    expect(j?.status).toBe("NOVO_INTERESSADO");
    await savePfDates(s.admin, c.id, { startDate: "2026-12-01", appBonusStart: "2026-12-10", meeting1At: "2026-12-05", meeting2At: "2026-12-25" });
    const after = await getPfJourney(s.admin, c.id);
    expect(after?.endDate).toBe("2026-12-31");
    expect(after?.appBonusEnd).toBe("2027-03-10");
  });

  it("recusa reunião 2 antes da reunião 1 e datas inválidas", async () => {
    const s = await setupOrg();
    const c = await pfClient(s);
    await expect(savePfDates(s.admin, c.id, { meeting1At: "2026-12-20", meeting2At: "2026-12-10" })).rejects.toBeInstanceOf(ValidationError);
    await expect(savePfDates(s.admin, c.id, { startDate: "31/02/2026" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("concluir todos os itens de uma etapa avança o status e fica no histórico", async () => {
    const s = await setupOrg();
    const c = await pfClient(s);
    for (let i = 0; i < 4; i++) await togglePfItem(s.admin, c.id, `1.${i}`);
    const j = await getPfJourney(s.admin, c.id);
    expect(j?.status).toBe("AGUARDANDO_CONTRATACAO");
    expect(j?.history.length).toBeGreaterThanOrEqual(4);
    await togglePfItem(s.admin, c.id, "1.0");
    expect((await getPfJourney(s.admin, c.id))?.doneItems).not.toContain("1.0");
    await expect(togglePfItem(s.admin, c.id, "99.9")).rejects.toBeInstanceOf(ValidationError);
  });

  it("só fica ativo depois de definir a continuidade", async () => {
    const s = await setupOrg();
    const c = await pfClient(s);
    await expect(setPfStatus(s.admin, c.id, "ATIVO_APLICATIVO")).rejects.toBeInstanceOf(ValidationError);
    await setPfContinuity(s.admin, c.id, "ACOMPANHAMENTO_MENSAL");
    const j = await getPfJourney(s.admin, c.id);
    expect(j?.status).toBe("ATIVO_ACOMPANHAMENTO");
    await expect(setPfContinuity(s.admin, c.id, "XYZ")).rejects.toBeInstanceOf(ValidationError);
  });

  it("a lista da página ROSAN LIFE traz só clientes PF", async () => {
    const s = await setupOrg();
    await pfClient(s);
    await createClient(s.admin, { legalName: "Empresa", tradeName: "Empresa", status: "ATIVO", services: [], memberIds: [] });
    const rows = await listPfClients(s.admin);
    expect(rows.map((r) => r.name)).toEqual(["Maria Souza"]);
    expect(await prisma.client.count()).toBe(2);
  });
});
