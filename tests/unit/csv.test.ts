import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/domain/csv";
import { clientProfitability } from "@/domain/profitability";

describe("csv", () => {
  it("lê ponto e vírgula, vírgula, aspas e BOM", () => {
    expect(parseCsv("﻿a;b;c\r\n1;\"x;y\";3\r\n")).toEqual([["a", "b", "c"], ["1", "x;y", "3"]]);
    expect(parseCsv("a,b\n\"he said \"\"hi\"\"\",2")).toEqual([["a", "b"], ['he said "hi"', "2"]]);
  });
  it("ignora linhas vazias", () => {
    expect(parseCsv("a;b\n\n;\n1;2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("escreve com BOM e protege contra fórmulas", () => {
    const out = toCsv([["Nome", "Valor"], ["=SOMA(A1)", "2500,00"], ['a;"b"', null]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain("'=SOMA(A1);2500,00");
    expect(out).toContain('"a;""b""";');
  });
});

describe("rentabilidade com custo direto", () => {
  it("soma o custo direto ao custo das horas", () => {
    const p = clientProfitability({ monthlyFee: 2000, minutes: 600, hourCost: 50, directCost: 100 });
    expect(p).toMatchObject({ hours: 10, cost: 600, margin: 1400, marginPct: 0.7 });
  });
  it("sem custo direto continua igual", () => {
    expect(clientProfitability({ monthlyFee: 2000, minutes: 600, hourCost: 50 }).cost).toBe(500);
  });
});
