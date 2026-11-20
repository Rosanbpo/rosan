import { z } from "zod";
import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { clientScope } from "./access";
import { npsOverview } from "./nps";

export const GOAL_METRICS = [
  { key: "MRR", label: "Receita mensal recorrente (MRR)", emoji: "💰", unit: "R$" },
  { key: "CLIENTES", label: "Clientes ativos", emoji: "🏢", unit: "" },
  { key: "NPS", label: "NPS da carteira", emoji: "⭐", unit: "" },
  { key: "UTILIZACAO", label: "Uso da capacidade da equipe", emoji: "⏱️", unit: "%" },
] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number]["key"];

export async function goalsOverview(actor: Actor) {
  assertCan(actor, "dashboard.view");
  const monthStart = new Date(`${new Date().toISOString().slice(0, 7)}-01T00:00:00-03:00`);
  const [targets, clients, nps, org, minutes] = await Promise.all([
    prisma.goalTarget.findMany({ where: { organizationId: actor.organizationId } }),
    prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null, status: "ATIVO" }, select: { monthlyFee: true } }),
    npsOverview(actor),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { capacityHours: true } }),
    prisma.timeEntry.aggregate({ where: { organizationId: actor.organizationId, workedOn: { gte: monthStart } }, _sum: { minutes: true } }),
  ]);
  const hours = (minutes._sum.minutes ?? 0) / 60;
  const current: Record<GoalMetric, number | null> = {
    MRR: clients.reduce((a, c) => a + Number(c.monthlyFee ?? 0), 0),
    CLIENTES: clients.length,
    NPS: nps.nps,
    UTILIZACAO: org.capacityHours ? Math.round((hours / org.capacityHours) * 100) : null,
  };
  const t = new Map(targets.map((x) => [x.metric, Number(x.target)]));
  return GOAL_METRICS.map((m) => ({ ...m, current: current[m.key], target: t.get(m.key) ?? null }));
}

export async function saveGoals(actor: Actor, raw: Record<string, unknown>) {
  assertCan(actor, "org.settings");
  for (const m of GOAL_METRICS) {
    const v = raw[m.key];
    if (v === undefined || v === null || String(v).trim() === "") {
      await prisma.goalTarget.deleteMany({ where: { organizationId: actor.organizationId, metric: m.key } });
      continue;
    }
    const n = z.number().min(-100).max(100_000_000).safeParse(Number(String(v).replace(/\./g, "").replace(",", ".")));
    if (!n.success) throw new ValidationError(`Meta inválida: ${m.label}.`);
    await prisma.goalTarget.upsert({ where: { organizationId_metric: { organizationId: actor.organizationId, metric: m.key } }, create: { organizationId: actor.organizationId, metric: m.key, target: n.data }, update: { target: n.data } });
  }
}

/** Base real para o simulador de cenários. */
export async function scenarioBase(actor: Actor) {
  assertCan(actor, "dashboard.view");
  const monthStart = new Date(`${new Date().toISOString().slice(0, 7)}-01T00:00:00-03:00`);
  const [clients, org, minutes] = await Promise.all([
    prisma.client.findMany({ where: { ...clientScope(actor), archivedAt: null, status: "ATIVO" }, select: { monthlyFee: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { capacityHours: true, hourCost: true } }),
    prisma.timeEntry.aggregate({ where: { organizationId: actor.organizationId, workedOn: { gte: monthStart } }, _sum: { minutes: true } }),
  ]);
  const mrr = clients.reduce((a, c) => a + Number(c.monthlyFee ?? 0), 0);
  const hours = (minutes._sum.minutes ?? 0) / 60;
  return {
    mrr,
    clients: clients.length,
    hoursPerClient: clients.length && hours > 0 ? Math.round((hours / clients.length) * 10) / 10 : 20,
    capacityHours: org.capacityHours ?? 160,
    hourCost: org.hourCost === null ? 40 : Number(org.hourCost),
    taxPct: 6,
  };
}
