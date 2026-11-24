import { assertCan } from "@/domain/permissions";
import { requireActor } from "@/server/context";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
const MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX = 4 * 1024 * 1024;

/** Recebe uma imagem de POP e devolve o id para usar no texto: ![legenda](img:ID). */
export async function POST(req: Request) {
  const actor = await requireActor();
  assertCan(actor, "procedures.manage");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Arquivo vazio." }, { status: 400 });
  if (!MIMES.includes(file.type)) return Response.json({ error: "Use PNG, JPG, WebP ou GIF." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Imagem maior que 4 MB." }, { status: 400 });
  const row = await prisma.procedureImage.create({
    data: { organizationId: actor.organizationId, name: file.name.slice(0, 200), mime: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) },
    select: { id: true },
  });
  return Response.json({ id: row.id });
}
