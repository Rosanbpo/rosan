import { getActor } from "@/server/context";
import { clientCsvTemplate, exportClientsCsv } from "@/server/services/clients-import";

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return new Response("Não autorizado", { status: 401 });
  const modelo = new URL(req.url).searchParams.get("modelo") === "1";
  const body = modelo ? clientCsvTemplate() : await exportClientsCsv(actor);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${modelo ? "modelo-clientes" : "clientes"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
