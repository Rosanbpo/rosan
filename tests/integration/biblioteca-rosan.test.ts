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

import { DEFAULT_ASSETS } from "@/domain/journey-assets";
import { ESTEIRAS } from "@/domain/esteiras";
import { createClient } from "@/server/services/clients";
import { createLead } from "@/server/services/leads";
import { applyJourneyStage, assetsForJourneyKey, journeyForClient, journeyForLead, listAssets, saveAsset } from "@/server/services/journey";
import { prisma } from "@/server/db";

describe("Jornada com textos padrão", () => {
  it("todo texto padrão aponta para uma tarefa que existe nas esteiras", () => {
    for (const a of DEFAULT_ASSETS) {
      for (const ref of a.refs) {
        const [slug, title] = ref.split("|");
        const found = ESTEIRAS.find((e) => e.slug === slug)?.stages.some((s) => s.tasks.some((t) => t.title === title));
        expect(found, `${a.title} → ${ref}`).toBe(true);
      }
    }
  });

  it("gera as tarefas de uma etapa para o cliente, sem duplicar, e a tarefa traz os textos padrão", async () => {
    const s = await setupOrg();
    const c = await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [] });
    const r = await applyJourneyStage(s.admin, { slug: "pre-onboarding", stageIdx: 0, startDate: "2026-12-01", clientId: c.id });
    expect(r.created).toBe(2);
    await expect(applyJourneyStage(s.admin, { slug: "pre-onboarding", stageIdx: 0, startDate: "2026-12-01", clientId: c.id })).rejects.toThrow();
    const task = await prisma.task.findFirstOrThrow({ where: { clientId: c.id, title: { startsWith: "Apresentar o responsável" } } });
    expect(task.dueAt.toISOString().slice(0, 10)).toBe("2026-12-02");
    const assets = await assetsForJourneyKey(s.admin, task.journeyKey);
    expect(assets.length).toBeGreaterThan(0);
    const view = await journeyForClient(s.admin, c.id, "2026-12-01");
    expect(view.find((v) => v.esteira.slug === "pre-onboarding")!.stages[0].generatedCount).toBe(2);
  });

  it("gera as tarefas da jornada comercial para um lead", async () => {
    const s = await setupOrg();
    const lead = await createLead(s.admin, { companyName: "Lead Ltda", servicesInterest: [] });
    const r = await applyJourneyStage(s.admin, { slug: "jornada-comercial", stageIdx: 0, startDate: "2026-12-01", leadId: lead.id });
    expect(r.created).toBe(4);
    const view = await journeyForLead(s.admin, lead.id, "2026-12-01");
    expect(view).toHaveLength(1);
    expect(view[0].stages[0].generatedCount).toBe(4);
    await expect(applyJourneyStage(s.op, { slug: "jornada-comercial", stageIdx: 1, startDate: "2026-12-01", leadId: lead.id })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("só a administradora edita os padrões", async () => {
    const s = await setupOrg();
    const first = (await listAssets(s.admin))[0];
    await saveAsset(s.admin, first.id, { kind: "MENSAGEM", stage: "COMERCIAL", title: "Novo", body: "Texto", taskRefs: ["jornada-comercial|Primeiro contato com o lead"] });
    expect((await listAssets(s.admin)).find((a) => a.id === first.id)!.title).toBe("Novo");
    await expect(saveAsset(s.op, first.id, { kind: "MENSAGEM", stage: "COMERCIAL", title: "x" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
