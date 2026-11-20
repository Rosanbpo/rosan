import { describe, expect, it } from "vitest";
import { ESTEIRAS, stagesToText, textToStages } from "@/domain/esteiras";

describe("esteira em texto", () => {
  it("ida e volta preserva todas as esteiras padrão", () => {
    for (const e of ESTEIRAS) expect(textToStages(stagesToText(e.stages))).toEqual(e.stages);
  });
  it("aceita categoria sem acento e prioridade", () => {
    const s = textToStages("## A\n### Fazer | documentacao | 2 | 30 | alta\n- um");
    expect(s[0].tasks[0]).toMatchObject({ category: "DOCUMENTACAO", day: 2, minutes: 30, priority: "ALTA", items: ["um"] });
  });
  it("explica o erro com a linha", () => {
    expect(() => textToStages("## A\n### X | Nada | 1 | 30")).toThrow(/Linha 2.*categoria/);
    expect(() => textToStages("### X | Cobrança | 1 | 30")).toThrow(/Linha 1/);
    expect(() => textToStages("## A")).toThrow(/ao menos uma tarefa/);
  });
});
