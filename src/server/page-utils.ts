import "server-only";
import { notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/domain/permissions";

/** Converte "sem acesso"/"inexistente" em 404, sem revelar qual dos dois. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) notFound();
    throw error;
  }
}

type SP = Record<string, string | string[] | undefined>;

export function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  const value = Array.isArray(v) ? v[0] : v;
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export function list(sp: SP, key: string): string[] {
  const v = sp[key];
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(",")).filter(Boolean);
}

export function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  return value && (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function pageOf(sp: SP): number {
  const n = Number(str(sp, "page") ?? 1);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
