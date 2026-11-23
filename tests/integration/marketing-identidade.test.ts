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

describe("trocar tema e programar", () => {
  it("pede troca com motivo, aprova limpa o pedido e guarda o horário", async () => {
    await resetDb();
    const a = (await setupOrg()).admin;
    const m = await import("@/server/services/marketing");
    await m.importCalendar(a);
    const [first] = await m.listCalendar(a);
    await expect(m.requestSwap(a, first.id, " ")).rejects.toThrow(/por que/);
    await m.requestSwap(a, first.id, "já falei disso");
    let row = (await m.listCalendar(a))[0];
    expect(row).toMatchObject({ swapRequested: true, swapReason: "já falei disso", approved: false });
    await m.setApproved(a, first.id, true);
    row = (await m.listCalendar(a))[0];
    expect(row).toMatchObject({ swapRequested: false, approved: true });
    await expect(m.setSchedule(a, first.id, { time: "25:00", state: "scheduled" })).rejects.toThrow(/HH:MM/);
    await m.setSchedule(a, first.id, { time: "07:30", state: "scheduled" });
    expect((await m.listCalendar(a))[0]).toMatchObject({ publishTime: "07:30", scheduled: true, status: "IDEIA" });
    await m.setSchedule(a, first.id, { time: "07:30", state: "published" });
    expect((await m.listCalendar(a))[0].status).toBe("PUBLICADO");
  });
});
