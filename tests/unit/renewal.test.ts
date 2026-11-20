import { describe, expect, it } from "vitest";
import { adjustedFee, contractTimeline } from "@/domain/renewal";

describe("renovação e reajuste", () => {
  it("calcula fim do prazo e próximo aniversário", () => {
    const t = contractTimeline("2026-01-15", 6, "2026-11-20");
    expect(t.termEnd).toBe("2026-07-14");
    expect(t.nextAnniversary).toBe("2027-01-15");
    expect(t.daysToAnniversary).toBe(56);
  });
  it("reajusta o valor", () => expect(adjustedFee(2000, 5)).toBe(2100));
});
