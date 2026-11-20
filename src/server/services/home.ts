import { addDays, instantToLocalDate, localDateTimeToInstant } from "@/domain/dates";
import { assertCan, type Actor, can } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { clientScope } from "./access";
import { buildTaskWhere } from "./tasks";
import { npsOverview } from "./nps";
import { renewalsDueCount } from "./renewals";

export type Insight = { tone: "success" | "warning" | "danger" | "info"; emoji: string; title: string; text: string; href: string; cta: string };

/** Visão geral da tela Início: números do dia, insights da operação e tarefas por cliente. */
export async function homeOverview(actor: Actor, now = new Date()) {
  assertCan(actor, "dashboard.view");
  const today = instantToLocalDate(now, APP_TIMEZONE);
  const todayStart = localDateTimeToInstant(today, "00:00", APP_TIMEZONE);
  const tomorrowStart = localDateTimeToInstant(addDays(today, 1), "00:00", APP_TIMEZONE);
  const next7End = localDateTimeToInstant(addDays(today, 8), "00:00", APP_TIMEZONE);
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00-03:00`);
  const OPEN = { status: { notIn: ["CONCLUIDA", "CANCELADA"] as ("CONCLUIDA" | "CANCELADA")[] } };
  const base = buildTaskWhere(actor, {});
  const w = (extra: object) => ({ AND: [base, extra] });
  const showFinance = can(actor, "finance.view");

  const [clients, openTasks, dueTodayCount, overdueCount, waitingClient, minutesToday, minutesMonth, org, byStatus, next7, todayList] = await Promise.all([
    prisma.client.findMany({
      where: { ...clientScope(actor), archivedAt: null, status: { not: "ENCERRADO" } },
      select: { id: true, tradeName: true, status: true, monthlyFee: true, journeyStage: true, responsibleOperatorId: true },
    }),
    prisma.task.findMany({
      where: w(OPEN),
      select: { id: true, title: true, status: true, dueAt: true, clientId: true, client: { select: { tradeName: true } } },
      orderBy: { dueAt: "asc" },
      take: 2000,
    }),
    prisma.task.count({ where: w({ ...OPEN, dueAt: { gte: todayStart, lt: tomorrowStart } }) }),
    prisma.task.count({ where: w({ ...OPEN, dueAt: { lt: now } }) }),
    prisma.task.count({ where: w({ status: "AGUARDANDO_CLIENTE" }) }),
    prisma.timeEntry.aggregate({ where: { organizationId: actor.organizationId, workedOn: { gte: todayStart, lt: tomorrowStart } }, _sum: { minutes: true } }),
    prisma.timeEntry.aggregate({ where: { organizationId: actor.organizationId, workedOn: { gte: monthStart } }, _sum: { minutes: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { capacityHours: true } }),
    prisma.task.groupBy({ by: ["status"], where: w({}), _count: { _all: true } }),
    prisma.task.findMany({
      where: w({ ...OPEN, dueAt: { gte: tomorrowStart, lt: next7End } }),
      select: { id: true, title: true, dueAt: true, client: { select: { tradeName: true } } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: w({ ...OPEN, dueAt: { lt: tomorrowStart } }),
      select: { id: true, title: true, status: true, dueAt: true, client: { select: { tradeName: true } } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
  ]);

  const active = clients.filter((c) => c.status === "ATIVO");
  const mrr = showFinance ? active.reduce((a, c) => a + Number(c.monthlyFee ?? 0), 0) : null;
  const onboarding = clients.filter((c) => c.journeyStage && ["PRE_ONBOARDING", "ONBOARDING", "IMPLANTACAO"].includes(c.journeyStage)).length;
  const noOwner = clients.filter((c) => !c.responsibleOperatorId).length;

  // tarefas por cliente
  const per = new Map<string, { id: string | null; name: string; open: number; overdue: number; today: number; next: { id: string; title: string; dueAt: Date | null }[] }>();
  for (const t of openTasks) {
    const key = t.clientId ?? "interna";
    const row = per.get(key) ?? { id: t.clientId, name: t.client?.tradeName ?? "Internas", open: 0, overdue: 0, today: 0, next: [] };
    row.open++;
    if (t.dueAt && t.dueAt < now) row.overdue++;
    else if (t.dueAt && t.dueAt < tomorrowStart) row.today++;
    if (row.next.length < 3) row.next.push({ id: t.id, title: t.title, dueAt: t.dueAt });
    per.set(key, row);
  }
  const byClient = [...per.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open);

  const nps = await npsOverview(actor);
  const renewals = can(actor, "contracts.manage") ? await renewalsDueCount(actor) : 0;
  const capacity = org.capacityHours ?? null;
  const usedHours = Math.round(((minutesMonth._sum.minutes ?? 0) / 60) * 10) / 10;
  const insights: Insight[] = [];
  if (overdueCount > 0) insights.push({ tone: "danger", emoji: "🔴", title: `${overdueCount} tarefa${overdueCount > 1 ? "s" : ""} atrasada${overdueCount > 1 ? "s" : ""}`, text: "Tarefas com prazo vencido pedem atenção para não virar problema com o cliente.", href: "/tarefas?atrasadas=1", cta: "Ver atrasadas" });
  if (waitingClient > 0) insights.push({ tone: "warning", emoji: "⏳", title: `${waitingClient} tarefa${waitingClient > 1 ? "s" : ""} esperando o cliente`, text: "Cobre o cliente para destravar o fechamento do mês.", href: "/pendencias?type=CLIENTE", cta: "Ver pendências" });
  if (noOwner > 0) insights.push({ tone: "info", emoji: "👤", title: `${noOwner} cliente${noOwner > 1 ? "s" : ""} sem responsável`, text: "Cliente sem dono tende a ser negligenciado na operação.", href: "/clientes", cta: "Atribuir responsável" });
  if (renewals > 0) insights.push({ tone: "warning", emoji: "🔄", title: `${renewals} contrato${renewals > 1 ? "s" : ""} para renovar ou reajustar`, text: "Fim de prazo ou aniversário do contrato nos próximos 60 dias.", href: "/contratos/renovacoes", cta: "Ver renovações" });
  if (nps.detractors.length > 0) insights.push({ tone: "danger", emoji: "😟", title: `${nps.detractors.length} cliente${nps.detractors.length > 1 ? "s" : ""} detrator${nps.detractors.length > 1 ? "es" : ""}`, text: `Nota até 6 na última pesquisa: ${nps.detractors.slice(0, 3).map((c) => c.tradeName).join(", ")}. Converse com eles.`, href: "/clientes", cta: "Ver clientes" });
  else if (nps.stale.length > 0) insights.push({ tone: "info", emoji: "⭐", title: `${nps.stale.length} cliente${nps.stale.length > 1 ? "s" : ""} sem nota de satisfação`, text: "Peça uma nota de 0 a 10 a cada trimestre para enxergar problemas cedo.", href: "/clientes", cta: "Registrar notas" });
  if (capacity) {
    const free = Math.max(0, capacity - usedHours);
    insights.push(free > capacity * 0.3
      ? { tone: "success", emoji: "✅", title: `${Math.round(free)}h disponíveis este mês`, text: "A equipe tem espaço para novos clientes sem comprometer a operação.", href: "/equipe", cta: "Ver capacidade" }
      : { tone: "warning", emoji: "⚠️", title: "Capacidade quase no limite", text: `${usedHours}h apontadas de ${capacity}h no mês. Cuidado ao aceitar novos clientes.`, href: "/equipe", cta: "Ver capacidade" });
  }
  if (!insights.length) insights.push({ tone: "success", emoji: "🎉", title: "Operação em dia", text: "Nenhum alerta no momento.", href: "/tarefas", cta: "Ver tarefas" });

  return {
    today, mrr, activeClients: active.length, onboarding, dueToday: dueTodayCount, overdue: overdueCount, waitingClient,
    hoursToday: Math.round(((minutesToday._sum.minutes ?? 0) / 60) * 10) / 10,
    nps: nps.nps, insights, byClient, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })), next7, todayList,
    openTotal: openTasks.length,
  };
}
