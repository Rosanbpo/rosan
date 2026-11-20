import { describe, expect, it } from "vitest";
import { buildIcs, fold } from "@/domain/ics";

describe("ics", () => {
  it("gera evento de dia inteiro com fim no dia seguinte", () => {
    const s = buildIcs("Agenda", [{ uid: "a@x", date: "2026-12-31", summary: "Fechar, o ano; ok" }], new Date("2026-11-20T10:00:00Z"));
    expect(s).toContain("DTSTART;VALUE=DATE:20261231");
    expect(s).toContain("DTEND;VALUE=DATE:20270101");
    expect(s).toContain("SUMMARY:Fechar\\, o ano\; ok");
    expect(s.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(s.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("dobra linhas longas sem passar de 75 octetos", () => {
    const f = fold("SUMMARY:" + "ação ".repeat(40));
    for (const l of f.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(f.replace(/\r\n /g, "")).toBe("SUMMARY:" + "ação ".repeat(40));
  });
});
