import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/permissions";
import { prisma } from "@/server/db";
import { createClient } from "@/server/services/clients";
import {
  buildEntryUrl,
  getAccessInfo,
  requestRosanLifeAccess,
} from "@/server/services/rosan-life-access";
import { resetDb, setupOrg } from "./helpers";

vi.mock("server-only", () => ({}));
beforeEach(async () => {
  await resetDb();
  process.env.ROSAN_LIFE_URL = "https://life.test";
  process.env.CENTRAL_API_SECRET = "s".repeat(40);
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ROSAN_LIFE_URL;
  delete process.env.CENTRAL_API_SECRET;
});

async function pf(
  s: Awaited<ReturnType<typeof setupOrg>>,
  email: string | null = "cli@x.com",
) {
  return createClient(s.admin, {
    legalName: "Maria",
    tradeName: "Maria",
    status: "ATIVO",
    services: [],
    serviceLines: ["CONSULTORIA_PF"],
    memberIds: [],
    contactEmail: email ?? undefined,
  });
}
const reply = (body: object) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body)));

describe("acesso ao ROSAN LIFE da cliente", () => {
  it("só entra com autorização ativa; sem ela nenhum bilhete é gerado", async () => {
    const s = await setupOrg();
    const c = await pf(s);
    for (const estado of [
      "nao_solicitada",
      "aguardando",
      "revogada",
      "recusada",
      "sem_conta",
    ]) {
      reply({ estado, acessos: [] });
      await expect(
        buildEntryUrl(s.admin, c.id, "https://central.rosanfinancas.com.br/x"),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede"));
    await expect(
      buildEntryUrl(s.admin, c.id, "https://central.rosanfinancas.com.br/x"),
    ).rejects.toThrow();
  });

  it("com autorização gera o endereço de entrada e registra na auditoria", async () => {
    const s = await setupOrg();
    const c = await pf(s);
    const f = reply({ estado: "autorizada", acessos: [] });
    const url = await buildEntryUrl(
      s.admin,
      c.id,
      `https://central.rosanfinancas.com.br/clientes/${c.id}?aba=rosanlife`,
    );
    expect(url.startsWith("https://life.test/api/central/entrar?t=")).toBe(
      true,
    );
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      email: "cli@x.com",
      consultant: "contato@rosanfinancas.com.br",
    });
    const token = decodeURIComponent(url.split("t=")[1]);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString(),
    );
    expect(payload).toMatchObject({
      c: "cli@x.com",
      u: "contato@rosanfinancas.com.br",
    });
    expect(payload.e - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60);
    expect(
      await prisma.auditEvent.count({
        where: { clientId: c.id, action: "rosanlife.access_opened" },
      }),
    ).toBe(1);
  });

  it("pedir autorização registra; conta inexistente orienta enviar convite", async () => {
    const s = await setupOrg();
    const c = await pf(s);
    reply({ resultado: "enviado" });
    expect(await requestRosanLifeAccess(s.admin, c.id)).toMatch(
      /Pedido enviado/,
    );
    expect(
      await prisma.auditEvent.count({
        where: { clientId: c.id, action: "rosanlife.access_requested" },
      }),
    ).toBe(1);
    reply({ resultado: "nao_encontrada" });
    await expect(requestRosanLifeAccess(s.admin, c.id)).rejects.toThrow(
      /convite/,
    );
  });

  it("sem e-mail da cliente não consulta o app; erro de rede vira aviso na ficha", async () => {
    const s = await setupOrg();
    const f = vi.spyOn(globalThis, "fetch");
    const semEmail = await pf(s, null);
    expect(await getAccessInfo(s.admin, semEmail.id)).toHaveProperty("erro");
    expect(f).not.toHaveBeenCalled();
    const c = await pf(s);
    f.mockRejectedValue(new Error("rede"));
    expect(await getAccessInfo(s.admin, c.id)).toHaveProperty("erro");
  });
});
