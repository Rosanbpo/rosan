import { ForbiddenError, NotFoundError } from "@/domain/permissions";
import { getActor } from "@/server/context";
import { getClientLogo } from "@/server/services/client-logo";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  try {
    const logo = await getClientLogo(actor, id);
    if (!logo) return new Response("Sem logo", { status: 404 });
    return new Response(new Uint8Array(logo.data), { headers: { "Content-Type": logo.contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    return new Response("Não encontrado", { status: e instanceof ForbiddenError ? 403 : e instanceof NotFoundError ? 404 : 500 });
  }
}
