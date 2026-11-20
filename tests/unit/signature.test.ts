import { describe, expect, it } from "vitest";
import { documentHash, isValidCpf, maskCpf, stableStringify } from "@/domain/signature";

describe("assinatura", () => {
  it("valida CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224726")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("mascara CPF", () => expect(maskCpf("52998224725")).toBe("***.982.247-**"));
  it("hash não depende da ordem das chaves e muda com o conteúdo", () => {
    expect(documentHash({ a: 1, b: [1, 2] })).toBe(documentHash({ b: [1, 2], a: 1 }));
    expect(documentHash({ a: 1 })).not.toBe(documentHash({ a: 2 }));
    expect(stableStringify({ b: undefined, a: 1 })).toBe('{"a":1}');
  });
});
