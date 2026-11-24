import { requireActor } from "@/server/context";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const img = await prisma.procedureImage.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!img) return new Response("Imagem não encontrada", { status: 404 });
  return new Response(new Uint8Array(img.data), { headers: { "Content-Type": img.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
