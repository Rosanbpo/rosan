import { beforeEach, describe, expect, it } from "vitest";
import { addPhoto, deletePhoto, getBrand, listPhotos, saveBrand } from "@/server/services/marketing";
import { DEFAULT_BRAND } from "@/domain/marketing";
import { resetDb, setupOrg } from "./helpers";

describe("identidade visual do marketing", () => {
  let actor: Awaited<ReturnType<typeof setupOrg>>["admin"];
  beforeEach(async () => {
    await resetDb();
    actor = (await setupOrg()).admin;
  });

  it("devolve o padrão e guarda as escolhas", async () => {
    expect((await getBrand(actor)).navy).toBe(DEFAULT_BRAND.navy);
    await saveBrand(actor, { ...DEFAULT_BRAND, navy: "#112233", titleFont: "lora", style: "CLASSICO" });
    const b = await getBrand(actor);
    expect(b).toMatchObject({ navy: "#112233", titleFont: "lora", style: "CLASSICO" });
  });

  it("recusa cor ou fonte inválida", async () => {
    await expect(saveBrand(actor, { ...DEFAULT_BRAND, gold: "dourado" })).rejects.toThrow(/#RRGGBB/);
    await expect(saveBrand(actor, { ...DEFAULT_BRAND, bodyFont: "comic" })).rejects.toThrow();
  });

  it("guarda e apaga fotos, recusando tipo e tamanho errados", async () => {
    const p = await addPhoto(actor, { name: "a.jpg", mime: "image/jpeg", data: Buffer.from([1, 2, 3]) });
    expect(await listPhotos(actor)).toHaveLength(1);
    await expect(addPhoto(actor, { name: "a.pdf", mime: "application/pdf", data: Buffer.from([1]) })).rejects.toThrow(/JPG/);
    await expect(addPhoto(actor, { name: "g.jpg", mime: "image/jpeg", data: Buffer.alloc(3 * 1024 * 1024 + 1) })).rejects.toThrow(/3 MB/);
    await deletePhoto(actor, p.id);
    expect(await listPhotos(actor)).toHaveLength(0);
  });
});

describe("calendário do plano de conteúdo", () => {
  it("carrega 23 conteúdos com data, sem duplicar, e aprova", async () => {
    await resetDb();
    const a = (await setupOrg()).admin;
    const { importCalendar, listCalendar, approveAll, setApproved } = await import("@/server/services/marketing");
    expect(await importCalendar(a)).toBe(23);
    await importCalendar(a);
    const list = await listCalendar(a);
    expect(list).toHaveLength(23);
    expect(list.filter((i) => i.format === "REEL")).toHaveLength(10);
    expect(list[0].publishOn?.toISOString().slice(0, 10)).toBe("2026-11-24");
    await setApproved(a, list[0].id, true);
    expect(await approveAll(a)).toBe(22);
  });
});
