import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ForbiddenError, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import type { ActionState } from "@/lib/action-state";
import { getActor } from "./context";

/**
 * Executa uma Server Action autenticada, convertendo erros de domínio em
 * mensagens amigáveis. Toda verificação de permissão acontece nos serviços.
 */
export async function runAction(
  fn: (actor: Actor) => Promise<string | void>,
  opts: { revalidate?: string[] } = {},
): Promise<ActionState> {
  const at = Date.now();
  try {
    const actor = await getActor();
    if (!actor) return { ok: false, error: "Sua sessão expirou. Entre novamente.", at };
    const message = await fn(actor);
    for (const path of opts.revalidate ?? ["/", "layout"]) {
      if (path === "layout") revalidatePath("/", "layout");
      else revalidatePath(path);
    }
    return { ok: true, message: message || "Alterações salvas.", at };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ValidationError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors, at };
    if (error instanceof ForbiddenError || error instanceof NotFoundError) return { ok: false, error: error.message, at };
    console.error("[action]", error);
    return { ok: false, error: "Não foi possível concluir a operação. Tente novamente.", at };
  }
}

/** Converte FormData em objeto, tratando campos múltiplos e JSON. */
export function formObject(
  fd: FormData,
  opts: { arrays?: string[]; json?: string[] } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$ACTION")) continue;
    if (opts.arrays?.includes(key)) {
      out[key] = fd.getAll(key).map(String).filter((v) => v !== "");
    } else if (opts.json?.includes(key)) {
      try {
        out[key] = JSON.parse(String(fd.get(key) ?? "null"));
      } catch {
        out[key] = undefined;
      }
    } else {
      out[key] = fd.get(key);
    }
  }
  for (const key of opts.arrays ?? []) if (!(key in out)) out[key] = [];
  return out;
}
