import { describe, expect, it } from "vitest";
import { signTicket } from "@/server/services/rosan-life-access";

// Vetor combinado com o app (src/lib/central-ticket.ts): se um lado mudar o formato, este teste e o do app quebram.
describe("bilhete de entrada no ROSAN LIFE", () => {
  it("gera exatamente o que o app sabe conferir", () => {
    const t = signTicket(
      {
        c: "cli@x.com",
        u: "adm@x.com",
        r: "https://central.rosanfinancas.com.br/clientes/1",
        e: 2000000000,
        j: "abc",
      },
      "s".repeat(40),
    );
    expect(t).toBe(
      "eyJjIjoiY2xpQHguY29tIiwidSI6ImFkbUB4LmNvbSIsInIiOiJodHRwczovL2NlbnRyYWwucm9zYW5maW5hbmNhcy5jb20uYnIvY2xpZW50ZXMvMSIsImUiOjIwMDAwMDAwMDAsImoiOiJhYmMifQ.mFhSv6cg19IZjYUBePPJhKp8QVxzBAdzITn44AIA-wg",
    );
  });
});
