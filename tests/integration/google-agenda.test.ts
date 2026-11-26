import { describe, it, expect, vi, afterEach } from "vitest";
import { googleEvents, saveImport, validGoogleIcsUrl } from "@/server/services/google-agenda";
import { setupOrg } from "./helpers";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:a1
DTSTART:20261130T130000Z
DTEND:20261130T140000Z
SUMMARY:Reunião com cliente
END:VEVENT
BEGIN:VEVENT
UID:a2
DTSTART;VALUE=DATE:20261201
DTEND;VALUE=DATE:20261202
SUMMARY:Dia inteiro
END:VEVENT
BEGIN:VEVENT
UID:a3
DTSTART:20261123T120000Z
DTEND:20261123T130000Z
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Semanal
END:VEVENT
END:VCALENDAR`;

afterEach(() => vi.unstubAllGlobals());

describe("Google Agenda por endereço iCal", () => {
  it("só aceita endereços do Google", () => {
    expect(validGoogleIcsUrl("https://calendar.google.com/calendar/ical/x/private-abc/basic.ics")).toBeTruthy();
    expect(validGoogleIcsUrl("http://calendar.google.com/x.ics")).toBeNull();
    expect(validGoogleIcsUrl("https://evil.com/x.ics")).toBeNull();
  });

  it("lê eventos simples, de dia inteiro e recorrentes", async () => {
    const { admin } = await setupOrg();
    await saveImport(admin, "https://calendar.google.com/calendar/ical/x/private-abc/basic.ics");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(ICS)));
    const { events, error } = await googleEvents(admin, "2026-11-01", "2026-12-31");
    expect(error).toBeUndefined();
    const labels = events.map((e) => `${e.date} ${e.time ?? "-"} ${e.label}`);
    expect(labels).toContain("2026-11-30 10:00 Reunião com cliente");
    expect(labels).toContain("2026-12-01 - Dia inteiro");
    expect(events.filter((e) => e.label === "Semanal").length).toBe(4);
  });
});
