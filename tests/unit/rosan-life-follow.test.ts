import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFollowUp, followFor, hasData } from "@/server/services/rosan-life-follow";

const ok = { conta: true, vinculo: true, clientId: "u1", semaforo: "pendencia", motivos: ["x"], diasSemRegistro: 3, semRegistroDesde: 4, ultimoRegistro: "2026-11-23", sequencia: 0, mes: { mes: "2026-11", gastoCents: 100, receitaCents: 0, orcadoCents: 0, usoPct: null }, contasAtrasadas: 0, metasAtivas: 0, ultimaReuniao: null, mesAnteriorFechado: false, ultimoAcesso: null };

beforeEach(() => { process.env.ROSAN_LIFE_URL = "https://life.test/"; process.env.CENTRAL_API_SECRET = "s".repeat(40); });
afterEach(() => { vi.restoreAllMocks(); delete process.env.ROSAN_LIFE_URL; delete process.env.CENTRAL_API_SECRET; });

describe("fetchFollowUp", () => {
  it("manda e-mails normalizados e sem repetição, com o segredo", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ clientes: { "a@b.com": ok } })));
    const r = await fetchFollowUp([" A@b.com ", "a@b.com", ""]);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://life.test/api/central/acompanhamento");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ emails: ["a@b.com"] });
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe("Bearer " + "s".repeat(40));
    expect(hasData(r["a@b.com"])).toBe(true);
  });
  it("sem e-mails não chama o app", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    expect(await fetchFollowUp([])).toEqual({});
    expect(f).not.toHaveBeenCalled();
  });
  it("sem configuração, devolve erro por e-mail em vez de fingir que está tudo bem", async () => {
    delete process.env.CENTRAL_API_SECRET;
    const r = await fetchFollowUp(["a@b.com"]);
    expect(r["a@b.com"]).toHaveProperty("erro");
  });
  it("erro de rede ou resposta ruim viram erro", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("rede"));
    expect(await fetchFollowUp(["a@b.com"])).toHaveProperty(["a@b.com", "erro"]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("no", { status: 500 }));
    expect(await fetchFollowUp(["a@b.com"])).toHaveProperty(["a@b.com", "erro"]);
  });
  it("e-mail que o app não devolveu vira erro; followFor ignora maiúsculas", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ clientes: {} })));
    const r = await fetchFollowUp(["a@b.com"]);
    expect(followFor(r, "A@B.com")).toHaveProperty("erro");
    expect(followFor(r, null)).toBeUndefined();
  });
});
