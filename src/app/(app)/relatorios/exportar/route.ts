import { getActor } from "@/server/context";
import { isMonth, currentMonth } from "@/server/services/portfolio";
import { monthlyReportCsv } from "@/server/services/reports";

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return new Response("Não autorizado", { status: 401 });
  const m = new URL(req.url).searchParams.get("mes") ?? undefined;
  const month = isMonth(m) ? m : currentMonth();
  let body: string;
  try {
    body = await monthlyReportCsv(actor, month);
  } catch {
    return new Response("Sem permissão", { status: 403 });
  }
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-${month}.csv"`, "Cache-Control": "no-store" },
  });
}
