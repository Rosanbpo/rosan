import { createHmac, randomUUID } from "crypto";
import { ValidationError, assertCan, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";
import { rosanLifeBase } from "./rosan-life-follow";

/** Acesso da gestora ao ROSAN LIFE da cliente: autorização pedida e dada dentro do app; entrada por bilhete assinado, sem senha. */
export type AccessState =
  | "sem_conta"
  | "nao_solicitada"
  | "aguardando"
  | "autorizada"
  | "revogada"
  | "recusada";
export type AccessInfo =
  | {
      estado: AccessState;
      autorizadaEm: string | null;
      revogadaEm: string | null;
      solicitadaEm: string | null;
      ultimoAcesso: string | null;
      acessos: { at: string; event: "entrada" | "saida"; via: string }[];
    }
  | { erro: string };

export const TICKET_TTL_SECONDS = 60;
/** Conta de administradora do ROSAN LIFE em nome da qual a Central entra. */
export const consultantEmail = () =>
  (process.env.ROSAN_LIFE_CONSULTANT_EMAIL ?? "contato@rosanfinancas.com.br")
    .trim()
    .toLowerCase();

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
/** Mesmo formato que o app confere (src/lib/central-ticket.ts). */
export function signTicket(
  t: { c: string; u: string; r: string; e: number; j: string },
  secret: string,
): string {
  const key = createHmac("sha256", secret).update("rosan-sso-v1").digest();
  const payload = b64(JSON.stringify(t));
  return `${payload}.${b64(createHmac("sha256", key).update(payload).digest())}`;
}

function config() {
  const base = rosanLifeBase(),
    secret = process.env.CENTRAL_API_SECRET;
  if (!base || !secret)
    throw new ValidationError(
      "A ligação com o ROSAN LIFE ainda não foi configurada (ROSAN_LIFE_URL e CENTRAL_API_SECRET).",
    );
  return { base, secret };
}

async function clientEmail(actor: Actor, clientId: string) {
  assertCan(actor, "clients.manage");
  const c = await assertClientAccess(actor, clientId);
  if (!c.contactEmail)
    throw new ValidationError(
      "Cadastre o e-mail do cliente (Contato principal) primeiro.",
    );
  return { email: c.contactEmail.trim().toLowerCase(), name: c.tradeName };
}

async function call<T>(
  path: string,
  body: object,
  secret: string,
  base: string,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new ValidationError(
      `O ROSAN LIFE respondeu com erro (${res.status}).`,
    );
  return (await res.json()) as T;
}

/** Situação da autorização. Erros de conexão voltam como `{ erro }` para a tela avisar, sem derrubar a ficha. */
export async function getAccessInfo(
  actor: Actor,
  clientId: string,
): Promise<AccessInfo> {
  try {
    const { base, secret } = config();
    const { email } = await clientEmail(actor, clientId);
    return await call<AccessInfo>(
      "/api/central/acesso",
      { email, consultant: consultantEmail() },
      secret,
      base,
    );
  } catch (e) {
    return {
      erro:
        e instanceof ValidationError
          ? e.message
          : "Não foi possível falar com o ROSAN LIFE agora.",
    };
  }
}

/** Pede a autorização à cliente (ela decide dentro do app). */
export async function requestRosanLifeAccess(
  actor: Actor,
  clientId: string,
): Promise<string> {
  const { base, secret } = config();
  const { email, name } = await clientEmail(actor, clientId);
  const r = await call<{ resultado: string }>(
    "/api/central/pedido-acesso",
    { email, consultant: consultantEmail() },
    secret,
    base,
  );
  if (r.resultado === "nao_encontrada")
    throw new ValidationError(
      "A cliente ainda não tem conta no ROSAN LIFE. Envie o convite primeiro, na aba Consultoria.",
    );
  if (r.resultado === "ja_vinculada")
    return "A cliente já autorizou o seu acesso.";
  await recordAudit(prisma, {
    organizationId: actor.organizationId,
    actorId: actor.userId,
    entityType: "Client",
    entityId: clientId,
    clientId,
    action: "rosanlife.access_requested",
    summary: `Pedido de autorização de acesso ao ROSAN LIFE enviado a ${name}.`,
  });
  return "Pedido enviado. A cliente vê o aviso no aplicativo e decide se permite.";
}

/** Gera o endereço de entrada no app. Confere a autorização agora; o app confere de novo ao entrar. */
export async function buildEntryUrl(
  actor: Actor,
  clientId: string,
  returnUrl: string,
): Promise<string> {
  const { base, secret } = config();
  const { email, name } = await clientEmail(actor, clientId);
  const info = await call<AccessInfo>(
    "/api/central/acesso",
    { email, consultant: consultantEmail() },
    secret,
    base,
  );
  if ("erro" in info || info.estado !== "autorizada")
    throw new ValidationError(
      "A cliente não autorizou o acesso (ou revogou a autorização).",
    );
  const token = signTicket(
    {
      c: email,
      u: consultantEmail(),
      r: returnUrl,
      e: Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS,
      j: randomUUID(),
    },
    secret,
  );
  await recordAudit(prisma, {
    organizationId: actor.organizationId,
    actorId: actor.userId,
    entityType: "Client",
    entityId: clientId,
    clientId,
    action: "rosanlife.access_opened",
    summary: `Acesso ao ROSAN LIFE de ${name} aberto pela Central.`,
  });
  return `${base}/api/central/entrar?t=${encodeURIComponent(token)}`;
}
