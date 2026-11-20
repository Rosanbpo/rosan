import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDailyDigests } from "@/server/services/digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Endpoint para agendadores externos (Vercel Cron, GitHub Actions, cron do
 * servidor via curl). Exige Authorization: Bearer <CRON_SECRET>.
 */
async function handler(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const summary = await sendDailyDigests(new URL(request.url).origin);
  return NextResponse.json(summary, { status: summary.errors.length ? 500 : 200 });
}

export { handler as GET, handler as POST };
