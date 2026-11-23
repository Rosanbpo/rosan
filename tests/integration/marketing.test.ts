import { beforeEach, describe, expect, it } from "vitest";
import { parseSlides } from "@/domain/marketing";
import { LIBRARY_IDEAS, LIBRARY_POSTS } from "@/domain/marketing-library";
import { ForbiddenError } from "@/domain/permissions";
import { createIdea, deleteIdea, getIdea, importLibrary, listIdeas, updateIdea } from "@/server/services/marketing";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

describe("central de conteúdos (marketing)", () => {
  it("lê os slides: capa, conteúdo e encerramento", () => {
    const s = parseSlides("Capa\nSub\n---\n1. Ponto\nTexto\n---\nFim\nChamada");
    expect(s.map((x) => x.kind)).toEqual(["capa", "conteudo", "final"]);
    expect(s[1]).toMatchObject({ title: "1. Ponto", body: "Texto" });
  });
  it("todos os posts da biblioteca têm capa, conteúdo e encerramento", () => {
    for (const p of LIBRARY_POSTS) {
      const s = parseSlides(p.slidesText);
      expect(s.length, p.key).toBeGreaterThanOrEqual(5);
      expect(s.at(-1)?.kind).toBe("final");
    }
  });
  it("importa a biblioteca uma única vez", async () => {
    const s = await setupOrg();
    expect(await importLibrary(s.admin)).toBe(LIBRARY_POSTS.length + LIBRARY_IDEAS.length);
    expect(await importLibrary(s.admin)).toBe(0);
    expect(await listIdeas(s.admin)).toHaveLength(LIBRARY_POSTS.length + LIBRARY_IDEAS.length);
  });
  it("cria, edita e exclui; operador não acessa", async () => {
    const s = await setupOrg();
    const row = await createIdea(s.admin, { title: "Ideia nova", pillar: "EDUCATIVO", status: "IDEIA" });
    await updateIdea(s.admin, row.id, { title: "Ideia nova", pillar: "MITOS", status: "PRONTO", slidesText: "A\n---\nB", publishOn: "2026-12-10" });
    expect(await getIdea(s.admin, row.id)).toMatchObject({ pillar: "MITOS", status: "PRONTO" });
    await expect(listIdeas(s.op)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteIdea(s.admin, row.id);
    expect(await listIdeas(s.admin)).toHaveLength(0);
  });
});
