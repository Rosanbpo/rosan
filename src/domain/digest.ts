export type DigestTask = { title: string; client: string | null; due: string; url: string };
export type DigestData = { name: string; overdue: DigestTask[]; today: DigestTask[]; waitingClient: number; origin: string; overdueTotal?: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const digestIsEmpty = (d: DigestData) => d.overdue.length === 0 && d.today.length === 0 && d.waitingClient === 0;

export function renderDigest(d: DigestData): { subject: string; html: string; text: string } {
  const first = d.name.split(" ")[0] ?? d.name;
  const parts: string[] = [];
  const late = d.overdueTotal ?? d.overdue.length;
  if (late) parts.push(plural(late, "tarefa atrasada", "tarefas atrasadas"));
  if (d.today.length) parts.push(`${plural(d.today.length, "vence", "vencem")} hoje`);
  const subject = parts.length ? `Central BPO: ${parts.join(" e ")}` : "Central BPO: resumo do dia";
  const li = (t: DigestTask) => `<li><a href="${esc(t.url)}">${esc(t.title)}</a>${t.client ? ` · ${esc(t.client)}` : ""} <span style="color:#64748b">(${esc(t.due)})</span></li>`;
  const block = (title: string, list: DigestTask[]) => (list.length ? `<h3 style="margin:16px 0 4px;font-size:15px">${title}</h3><ul style="margin:0;padding-left:18px">${list.map(li).join("")}</ul>` : "");
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:560px"><h2 style="font-size:18px">Bom dia, ${esc(first)}! 👋</h2>${block("🔴 Atrasadas", d.overdue)}${block("📅 Para hoje", d.today)}${d.waitingClient ? `<p style="margin-top:16px">⏳ ${plural(d.waitingClient, "tarefa esperando", "tarefas esperando")} resposta do cliente. <a href="${esc(d.origin)}/pendencias">Ver pendências</a></p>` : ""}<p style="margin-top:20px"><a href="${esc(d.origin)}/inicio">Abrir a Central BPO</a></p></div>`;
  const line = (t: DigestTask) => `- ${t.title}${t.client ? ` · ${t.client}` : ""} (${t.due}) ${t.url}`;
  const text = [`Bom dia, ${first}!`, d.overdue.length ? `\nAtrasadas:\n${d.overdue.map(line).join("\n")}` : "", d.today.length ? `\nPara hoje:\n${d.today.map(line).join("\n")}` : "", d.waitingClient ? `\n${plural(d.waitingClient, "tarefa esperando", "tarefas esperando")} resposta do cliente: ${d.origin}/pendencias` : "", `\n${d.origin}/inicio`].filter(Boolean).join("\n");
  return { subject, html, text };
}

export function renderSignMail(input: { partyName: string; issuer: string; url: string; days: number }) {
  const subject = `Contrato para assinatura: ${input.issuer}`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:560px"><p>Olá, ${esc(input.partyName)}!</p><p>A ${esc(input.issuer)} enviou o contrato de prestação de serviços para você assinar online. Leia e assine pelo link (vale por ${input.days} dias):</p><p><a href="${esc(input.url)}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ler e assinar o contrato</a></p><p style="color:#64748b;font-size:13px">Se o botão não abrir, copie este endereço: ${esc(input.url)}</p></div>`;
  const text = `Olá, ${input.partyName}!\n\nA ${input.issuer} enviou o contrato para você assinar online (vale por ${input.days} dias):\n${input.url}`;
  return { subject, html, text };
}
