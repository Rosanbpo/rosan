import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { revealVaultSecret } from "@/server/services/vault";

/** Revela a senha de um item do cofre (POST, nunca em cache). Cada chamada é auditada. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Não autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { itemId } = await params;
  try {
    const r = await revealVaultSecret(actor, itemId);
    return Response.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const status = e instanceof ForbiddenError ? 403 : e instanceof NotFoundError ? 404 : e instanceof ValidationError ? 400 : 500;
    return Response.json({ error: e instanceof Error && status !== 500 ? e.message : "Erro ao abrir o cofre." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
