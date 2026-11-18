import { getActor } from "@/server/context";
import { ForbiddenError } from "@/domain/permissions";
import { exportOrganizationData } from "@/server/services/backup";

export async function GET() {
  const actor = await getActor();
  if (!actor) return new Response("Não autorizado", { status: 401 });
  try {
    const data = await exportOrganizationData(actor);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="rosan-backup-${day}.json"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Sem permissão", { status: 403 });
    throw e;
  }
}
