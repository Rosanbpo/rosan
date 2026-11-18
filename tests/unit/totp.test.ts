import { describe, expect, it } from "vitest";
import { base32Encode, generateRecoveryCodes, generateTotpSecret, totpAt, verifyTotp } from "@/domain/totp";

describe("TOTP", () => {
  it("bate com os vetores da RFC 6238 (SHA-1)", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(totpAt(secret, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(secret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(secret, Math.floor(20000000000 / 30))).toBe("353130");
  });
  it("verifica com tolerância e impede reutilização", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    const code = totpAt(secret, step);
    expect(verifyTotp(secret, code, now)).toBe(step);
    expect(verifyTotp(secret, totpAt(secret, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step + 5), now)).toBeNull();
    expect(verifyTotp(secret, code, now, step)).toBeNull();
    expect(verifyTotp(secret, "abc123", now)).toBeNull();
  });
  it("gera códigos de recuperação distintos", () => {
    const c = generateRecoveryCodes();
    expect(new Set(c).size).toBe(8);
    expect(c[0]).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
  });
});
