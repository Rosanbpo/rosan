import { describe, expect, it } from "vitest";
import { buildMindMap, isStructured, layoutMindMap, parsePop } from "@/domain/pop-markup";

const sample = `## Objetivo
Texto com **negrito**.

> [regra] Princípio: O BPO nunca executa pagamentos.

## Fluxo
1. Levantamento
   Identificar vencimentos.
2. Lançamento

### Cuidados
- Conferir valor
- [ ] Item de checklist

| Situação | Ação |
|---|---|
| Duplicado | Remover |

---`;

describe("POP no formato Notion", () => {
  it("interpreta os blocos", () => {
    const b = parsePop(sample);
    expect(b.map((x) => x.type)).toEqual(["heading", "paragraph", "callout", "heading", "steps", "heading", "bullets", "checks", "table", "divider"]);
    const callout = b[2]!;
    expect(callout).toMatchObject({ tone: "regra", title: "Princípio" });
    const steps = b[4]!;
    expect(steps.type === "steps" && steps.items[0]).toEqual({ text: "Levantamento", detail: "Identificar vencimentos." });
    expect(b[8]!.type === "table" && b[8]!.rows).toEqual([["Situação", "Ação"], ["Duplicado", "Remover"]]);
  });
  it("reconhece o formato antigo", () => {
    expect(isStructured("Abrir o banco\nConferir saldo")).toBe(false);
    expect(isStructured(sample)).toBe(true);
  });
  it("gera mapa mental e posições", () => {
    const tree = buildMindMap("Contas a pagar", parsePop(sample));
    expect(tree.children.map((c) => c.label)).toEqual(["Objetivo", "Fluxo"]);
    const fluxo = tree.children[1]!;
    expect(fluxo.children.map((c) => c.label)).toEqual(["Levantamento", "Lançamento", "Cuidados"]);
    expect(fluxo.children[2]!.children.map((c) => c.label)).toEqual(["Conferir valor", "Item de checklist", "Duplicado"]);
    const lay = layoutMindMap(tree);
    expect(lay.nodes[0]!.depth).toBe(0);
    expect(lay.edges.length).toBe(lay.nodes.length - 1);
  });
});
