import { describe, expect, it } from "vitest";
import { parsePop } from "@/domain/pop-markup";

describe("POP com imagem", () => {
  it("reconhece a imagem entre os blocos", () => {
    const b = parsePop("- Abrir a agenda\n\n![tela da agenda](img:abc123)\n\n- Selecionar o paciente");
    expect(b.map((x) => x.type)).toEqual(["bullets", "image", "bullets"]);
    expect(b[1]).toEqual({ type: "image", id: "abc123", caption: "tela da agenda" });
  });
});
