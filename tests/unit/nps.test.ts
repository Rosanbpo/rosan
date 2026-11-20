import { describe, expect, it } from "vitest";
import { classifyNps, npsScore } from "@/domain/nps";

describe("NPS", () => {
  it("classifica notas", () => {
    expect(classifyNps(10)).toBe("PROMOTOR");
    expect(classifyNps(8)).toBe("NEUTRO");
    expect(classifyNps(6)).toBe("DETRATOR");
  });
  it("calcula o NPS", () => {
    expect(npsScore([])).toBeNull();
    expect(npsScore([10, 9, 8, 3])).toBe(25);
  });
});
