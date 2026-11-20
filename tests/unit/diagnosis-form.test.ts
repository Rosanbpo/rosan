import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, missingQuestions, readAnswers, toColumns, type Answers } from "@/domain/diagnosis-form";

const full = (): Record<string, unknown> => {
  const r: Record<string, unknown> = {};
  for (const q of ALL_QUESTIONS) {
    r[q.key] = q.type === "number" ? "5" : q.type === "money" ? "50.000,00" : q.type === "yesno" ? "Sim" : q.type === "radio" ? q.options![0] : q.type === "checks" ? [q.options![0]] : q.type === "email" ? "a@b.com" : q.type === "tel" ? "11999998888" : "texto";
  }
  return r;
};

describe("diagnóstico completo", () => {
  it("formulário completo não tem pendências", () => expect(missingQuestions(readAnswers(full()))).toEqual([]));
  it("toda pergunta é obrigatória", () => {
    for (const q of ALL_QUESTIONS) {
      const r = full();
      delete r[q.key];
      expect(missingQuestions(readAnswers(r)).map((m) => m.key)).toEqual([q.key]);
    }
  });
  it("zero é resposta válida, vazio não", () => {
    const r = full(); r.cardsCount = "0";
    expect(missingQuestions(readAnswers(r))).toEqual([]);
    r.cardsCount = "";
    expect(missingQuestions(readAnswers(r)).map((m) => m.key)).toEqual(["cardsCount"]);
  });
  it("Outro exige o texto", () => {
    const r = full(); r.howFound = "Outro";
    expect(missingQuestions(readAnswers(r)).map((m) => m.key)).toEqual(["howFound"]);
    r.howFoundOther = "Evento";
    expect(missingQuestions(readAnswers(r))).toEqual([]);
  });
  it("converte para os campos da precificação", () => {
    const a: Answers = readAnswers({ ...full(), regime: "Lucro Presumido", employeesClt: "3", employeesPj: "2", payablesCount: "40", salesCount: "60", revenue: "120.000,50", sellsCard: "Não", sellsOnline: "Não", machinesCount: "0", cardsCount: "0", banks: "Nenhum", onlinePlatforms: "Nenhuma", erpName: "Omie", books: "Desorganizado" });
    const c = toColumns(a);
    expect(c).toMatchObject({ regime: "PRESUMIDO", employees: 5, entries: 100, revenue: 120000.5, books: "DESORGANIZADA", cardsAndMarketplaces: false, banks: null, platforms: "Omie", wantsReports: false });
  });
});

describe("serviços marcados", () => {
  it("vários serviços ligam os relatórios", () => {
    const a = readAnswers({ ...full(), services: ["Contas a pagar", "Relatórios (inadimplentes, contas a pagar, DRE e fluxo de caixa)"] });
    expect(a.services).toHaveLength(2);
    expect(toColumns(a).wantsReports).toBe(true);
  });
});
