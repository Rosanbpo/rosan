import "server-only";
import { sendMail } from "./mail";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const LIFE_LOGO = "https://life.rosanfinancas.com.br/email-logo-rosan-life.png";

/** `header: "life"` usa o logo do ROSAN LIFE no cabeçalho azul; sem ele, mantém o texto ROSAN FINANÇAS. */
function layout(title: string, body: string, cta: { label: string; url: string }, header?: "life") {
  const head = header === "life"
    ? `<div style="background:#1a2843;padding:20px 24px"><img src="${LIFE_LOGO}" width="257" height="70" alt="ROSAN LIFE" style="display:block;border:0;width:257px;max-width:100%;height:auto"></div>`
    : `<div style="background:#071938;padding:20px 24px;color:#D2B37D;font-size:18px;letter-spacing:2px">ROSAN FINANÇAS</div>`;
  return `<div style="background:#f4f1ec;padding:24px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">${head}<div style="padding:24px;color:#1b2540;font-size:15px;line-height:1.6"><h2 style="margin:0 0 12px;color:#071938;font-size:18px">${esc(title)}</h2>${body}<p style="margin:24px 0"><a href="${cta.url}" style="background:#071938;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${esc(cta.label)}</a></p><p style="font-size:12px;color:#6E4E40">Se o botão não abrir, copie este endereço no navegador:<br>${esc(cta.url)}</p></div></div></div>`;
}

export function sendInviteEmail(to: string, name: string, clientName: string, url: string) {
  const first = name.split(" ")[0];
  return sendMail({
    to,
    subject: "Seu acesso ao Portal do Cliente — Rosan Finanças",
    text: `Olá, ${first}! A Rosan Finanças liberou seu acesso ao Portal do Cliente de ${clientName}. Crie sua senha em: ${url} (o link vale por 7 dias).`,
    html: layout("Seu acesso ao portal", `<p>Olá, ${esc(first)}!</p><p>A Rosan Finanças liberou o seu acesso ao Portal do Cliente de <strong>${esc(clientName)}</strong>. Por lá você acompanha as solicitações, responde dúvidas e envia documentos com segurança.</p><p>O link vale por 7 dias.</p>`, { label: "Criar minha senha", url }),
  });
}

export function sendResetEmail(to: string, name: string, url: string) {
  const first = name.split(" ")[0];
  return sendMail({
    to,
    subject: "Redefinir sua senha — Portal Rosan Finanças",
    text: `Olá, ${first}! Para criar uma nova senha, acesse: ${url} (o link vale por 2 horas). Se você não pediu, ignore este e-mail.`,
    html: layout("Redefinir senha", `<p>Olá, ${esc(first)}!</p><p>Recebemos um pedido para criar uma nova senha. O link vale por 2 horas. Se não foi você, ignore este e-mail.</p>`, { label: "Criar nova senha", url }),
  });
}

export function sendRosanLifeInviteEmail(to: string, name: string, url: string) {
  const first = name.split(" ")[0];
  return sendMail({
    to,
    subject: "Seu acesso ao ROSAN LIFE — Rosan Finanças",
    text: `Olá, ${first}! Liberei o seu acesso ao ROSAN LIFE, o aplicativo que vamos usar na sua consultoria financeira. Crie sua conta em: ${url} (o link vale por 14 dias).`,
    html: layout("Seu acesso ao ROSAN LIFE", `<p>Olá, ${esc(first)}!</p><p>Liberei o seu acesso ao <strong>ROSAN LIFE</strong>, o aplicativo de organização financeira que vamos usar na sua consultoria.</p><p>O link vale por 14 dias e só funciona com este e-mail.</p>`, { label: "Criar minha conta", url }, "life"),
  });
}
