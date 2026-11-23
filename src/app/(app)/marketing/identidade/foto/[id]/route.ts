import { NotFoundError } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { getPhoto } from "@/server/services/marketing";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  try {
    const p = await getPhoto(actor, id);
    return new Response(new Uint8Array(p.data), { headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    if (e instanceof NotFoundError) return new Response("Foto não encontrada", { status: 404 });
    throw e;
  }
}
