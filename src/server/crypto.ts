import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Criptografia do cofre: AES-256-GCM. A chave vem de VAULT_ENCRYPTION_KEY (qualquer texto longo; é transformado em 32 bytes). */
export function vaultConfigured(): boolean {
  return !!process.env.VAULT_ENCRYPTION_KEY && process.env.VAULT_ENCRYPTION_KEY.length >= 16;
}

function key(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) throw new Error("Cofre não configurado: defina VAULT_ENCRYPTION_KEY (mínimo 16 caracteres).");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !enc) throw new Error("Segredo inválido.");
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
