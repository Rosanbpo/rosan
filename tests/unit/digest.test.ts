import { describe, expect, it } from "vitest";
import { digestIsEmpty, renderDigest, renderSignMail } from "@/domain/digest";

const base = { name: "Ana Souza", overdue: [], today: [], waitingClient: 0, origin: "https://x.app" };
describe("digest", () => {
  it("vazio não envia", () => expect(digestIsEmpty(base)).toBe(true));
  it("assunto resume e escapa HTML", () => {
    const d = { ...base, overdue: [{ title: "<b>Pagar</b>", client: "Loja & Cia", due: "10/11", url: "https://x.app/tarefas/1" }], today: [{ title: "A", client: null, due: "hoje", url: "u" }, { title: "B", client: null, due: "hoje", url: "u" }] };
    const r = renderDigest(d);
    expect(r.subject).toBe("Central BPO: 1 tarefa atrasada e 2 vencem hoje");
    expect(r.html).toContain("&lt;b&gt;Pagar&lt;/b&gt;");
    expect(r.html).toContain("Loja &amp; Cia");
    expect(r.text).toContain("Bom dia, Ana!");
  });
  it("e-mail de assinatura traz o link", () => {
    const r = renderSignMail({ partyName: "Maria", issuer: "Rosan Finanças", url: "https://x/assinar/t", days: 14 });
    expect(r.html).toContain("https://x/assinar/t");
    expect(r.text).toContain("14 dias");
  });
});
