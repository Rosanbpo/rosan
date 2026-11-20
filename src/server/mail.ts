import "server-only";

export type MailResult = { ok: true } | { ok: false; error: string };

export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

/** Envia e-mail pela API do Resend. Sem RESEND_API_KEY e MAIL_FROM, não envia. */
export async function sendMail(input: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { ok: false, error: "O envio de e-mail ainda não foi configurado (RESEND_API_KEY e MAIL_FROM)." };
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text, ...(input.replyTo ? { reply_to: input.replyTo } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: `O serviço de e-mail recusou o envio (${res.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível falar com o serviço de e-mail." };
  }
}
