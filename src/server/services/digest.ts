import { addDays, instantToLocalDate, localDateTimeToInstant } from "@/domain/dates";
import { digestIsEmpty, renderDigest, renderSignMail, type DigestTask } from "@/domain/digest";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { SIGN_LINK_DAYS } from "@/domain/signature";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { mailConfigured, sendMail } from "../mail";
import { latestSignLink } from "./signature";

const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: APP_TIMEZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Envia o resumo do dia (atrasadas, vencendo hoje e esperando cliente) a quem tem o aviso ligado. */
export async function sendDailyDigests(origin: string, now = new Date()) {
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const tomorrow = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const members = await prisma.membership.findMany({ where: { active: true, user: { active: true, emailDigest: true, isDemo: false } }, include: { user: { select: { id: true, name: true, email: true } } } });
  let sent = 0, skipped = 0;
  const errors: string[] = [];
  for (const m of members) {
    const open = { organizationId: m.organizationId, archivedAt: null, assigneeId: m.userId, status: { notIn: ["CONCLUIDA", "CANCELADA"] as ("CONCLUIDA" | "CANCELADA")[] } };
    const lateWhere = { ...open, dueAt: { lt: localDateTimeToInstant(today, "00:00", APP_TIMEZONE) } };
    const [lateTotal, late, due, waiting] = await Promise.all([
      prisma.task.count({ where: lateWhere }),
      prisma.task.findMany({ where: { ...open, dueAt: { lt: localDateTimeToInstant(today, "00:00", APP_TIMEZONE) } }, orderBy: { dueAt: "asc" }, take: 10, select: { id: true, title: true, dueAt: true, client: { select: { tradeName: true } } } }),
      prisma.task.findMany({ where: { ...open, dueAt: { gte: localDateTimeToInstant(today, "00:00", APP_TIMEZONE), lt: tomorrow } }, orderBy: { dueAt: "asc" }, take: 10, select: { id: true, title: true, dueAt: true, client: { select: { tradeName: true } } } }),
      prisma.task.count({ where: { ...open, status: { in: ["AGUARDANDO_CLIENTE"] } } }),
    ]);
    const toItem = (t: (typeof late)[number]): DigestTask => ({ title: t.title, client: t.client?.tradeName ?? null, due: fmt(t.dueAt), url: `${origin}/tarefas/${t.id}` });
    const data = { name: m.user.name, overdue: late.map(toItem), overdueTotal: lateTotal, today: due.map(toItem), waitingClient: waiting, origin };
    if (digestIsEmpty(data)) { skipped++; continue; }
    const r = await sendMail({ to: m.user.email, ...renderDigest(data) });
    if (r.ok) sent++; else errors.push(`${m.user.email}: ${r.error}`);
  }
  return { sent, skipped, errors };
}

/** Envia o link de assinatura do contrato para o e-mail do cliente. */
export async function emailSignLink(actor: Actor, contractId: string, to: string, origin: string) {
  assertCan(actor, "contracts.manage");
  if (!mailConfigured()) throw new ValidationError("O envio de e-mail ainda não foi configurado. Copie o link e envie por WhatsApp ou e-mail.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new ValidationError("Digite um e-mail válido.");
  const link = await latestSignLink(actor, contractId);
  if (!link || link.status !== "PENDENTE") throw new ValidationError("Gere o link de assinatura primeiro.");
  const [contract, org] = await Promise.all([
    prisma.contract.findUniqueOrThrow({ where: { id: contractId }, select: { partyName: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { name: true, email: true } }),
  ]);
  const r = await sendMail({ to, replyTo: org.email ?? undefined, ...renderSignMail({ partyName: contract.partyName, issuer: org.name, url: `${origin}/assinar/${link.token}`, days: SIGN_LINK_DAYS }) });
  if (!r.ok) throw new ValidationError(r.error);
}
