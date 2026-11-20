import { buildIcs } from "@/domain/ics";
import { feedEvents } from "@/server/services/agenda";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** Agenda do usuário em formato iCalendar, protegida pelo token secreto da URL. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  const feed = token.length >= 32 ? await prisma.agendaFeed.findUnique({ where: { token } }) : null;
  if (!feed) return new Response("Link inválido ou desativado.", { status: 404 });
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: feed.userId, organizationId: feed.organizationId } },
    include: { user: true },
  });
  if (!membership || !membership.active || !membership.user.active) return new Response("Link inválido ou desativado.", { status: 404 });
  const actor = { userId: feed.userId, organizationId: feed.organizationId, role: membership.role, name: membership.user.name };
  const origin = new URL(req.url).origin;
  const events = await feedEvents(actor, origin);
  return new Response(buildIcs("Central BPO", events), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
  });
}
