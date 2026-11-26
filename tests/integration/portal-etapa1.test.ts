import { describe, it, expect } from "vitest";
import { prisma } from "@/server/db";
import { acceptInvite, assertPortalClient, inviteToPortal, portalLogin, readSession, requestPasswordReset, resetPassword, revokePortalAccess, setPortalUserSuspended } from "@/server/services/portal-auth";
import { setupOrg } from "./helpers";

async function twoClients() {
  const { admin, org } = await setupOrg();
  const mk = (n: string) => prisma.client.create({ data: { organizationId: org.id, legalName: n, tradeName: n, status: "ATIVO" } as never });
  return { admin, a: await mk("Empresa A"), b: await mk("Empresa B") };
}

describe("Portal do Cliente — etapa 1", () => {
  it("convite, senha, login e isolamento entre empresas", async () => {
    const { admin, a, b } = await twoClients();
    const inv = await inviteToPortal(admin, a.id, { name: "Maria Silva", email: "Maria@A.com" });
    expect(inv.token).toBeTruthy();
    const s = await acceptInvite(inv.token!, "senhaforte123");
    const sess = await readSession(s.token);
    expect(sess?.clients.map((c) => c.id)).toEqual([a.id]);
    expect(() => assertPortalClient(sess!, a.id)).not.toThrow();
    expect(() => assertPortalClient(sess!, b.id)).toThrow();
    // convite não pode ser reutilizado
    await expect(acceptInvite(inv.token!, "outrasenha123")).rejects.toThrow();
    // login funciona com e-mail em qualquer caixa
    expect((await portalLogin("maria@a.com", "senhaforte123")).token).toBeTruthy();
    await expect(portalLogin("maria@a.com", "errada")).rejects.toThrow("incorretos");
    await expect(portalLogin("naoexiste@x.com", "qualquer")).rejects.toThrow("incorretos");
  });

  it("bloqueia após 5 erros, suspende e remove acesso", async () => {
    const { admin, a } = await twoClients();
    const inv = await inviteToPortal(admin, a.id, { name: "João", email: "joao@a.com" });
    const s = await acceptInvite(inv.token!, "senhaforte123");
    for (let i = 0; i < 5; i++) await expect(portalLogin("joao@a.com", "errada")).rejects.toThrow();
    await expect(portalLogin("joao@a.com", "senhaforte123")).rejects.toThrow("Muitas tentativas");
    await prisma.portalUser.update({ where: { email: "joao@a.com" }, data: { lockedUntil: null } });
    await setPortalUserSuspended(admin, inv.user.id, true);
    expect(await readSession(s.token)).toBeNull();
    await expect(portalLogin("joao@a.com", "senhaforte123")).rejects.toThrow("suspenso");
    await setPortalUserSuspended(admin, inv.user.id, false);
    const s2 = await portalLogin("joao@a.com", "senhaforte123");
    await revokePortalAccess(admin, inv.user.id, a.id);
    expect(await readSession(s2.token)).toBeNull();
  });

  it("redefinição de senha encerra sessões e o link só vale uma vez", async () => {
    const { admin, a } = await twoClients();
    const inv = await inviteToPortal(admin, a.id, { name: "Ana", email: "ana@a.com" });
    const s = await acceptInvite(inv.token!, "senhaforte123");
    const r = await requestPasswordReset("ana@a.com");
    await resetPassword(r!.token, "novasenha1234");
    expect(await readSession(s.token)).toBeNull();
    await expect(resetPassword(r!.token, "outra123456")).rejects.toThrow();
    expect((await portalLogin("ana@a.com", "novasenha1234")).token).toBeTruthy();
    expect(await requestPasswordReset("ninguem@x.com")).toBeNull();
  });

  it("e-mail da mesma pessoa pode ter mais de uma empresa", async () => {
    const { admin, a, b } = await twoClients();
    const i1 = await inviteToPortal(admin, a.id, { name: "Lia", email: "lia@x.com" });
    const s = await acceptInvite(i1.token!, "senhaforte123");
    const i2 = await inviteToPortal(admin, b.id, { name: "Lia", email: "lia@x.com" });
    expect(i2.token).toBeNull();
    expect((await readSession(s.token))?.clients.length).toBe(2);
  });
});
