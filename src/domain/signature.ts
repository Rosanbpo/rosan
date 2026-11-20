import { createHash } from "node:crypto";

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function isValidCpf(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export const formatCpf = (raw: string) => onlyDigits(raw).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
/** 123.456.789-09 → ***.456.789-** (para exibir no comprovante público). */
export const maskCpf = (raw: string) => formatCpf(raw).replace(/^\d{3}\.(\d{3})\.(\d{3})-\d{2}$/, "***.$1.$2-**");

/** Ordena as chaves para que o mesmo conteúdo gere sempre o mesmo texto. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, x]) => `${JSON.stringify(k)}:${stableStringify(x)}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

export const documentHash = (content: unknown) => createHash("sha256").update(stableStringify(content)).digest("hex");

export const SIGN_LINK_DAYS = 14;
