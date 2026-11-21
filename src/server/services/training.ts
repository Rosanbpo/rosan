import { assertCan, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";

const DEFAULTS = [
  ["Ativar a verificação em duas etapas", "Em Minha conta, ative o 2FA antes de acessar o cofre.", null],
  ["Conhecer os clientes e a rotina de cada um", "Abra o painel de cada cliente: Dados, Rotina, POPs e particularidades.", null],
  ["Ler os POPs principais", "Estude os processos padrão de conciliação, contas a pagar e fechamento.", "/pops"],
  ["Entender o fechamento mensal", "Veja o checklist de Fechamentos de um cliente e o que falta em cada item.", null],
  ["Usar o cronômetro e apontar horas", "Aponte o tempo de cada tarefa para a rentabilidade ficar correta.", "/tarefas"],
  ["Fazer o primeiro fechamento acompanhado", "Faça um fechamento completo junto com a gestora.", null],
] as const;

/** Itens da trilha, criando os padrões na primeira vez. */
export async function trainingItems(actor: Actor) {
  const count = await prisma.trainingItem.count({ where: { organizationId: actor.organizationId } });
  if (count === 0) await prisma.trainingItem.createMany({ data: DEFAULTS.map(([title, description, url], position) => ({ organizationId: actor.organizationId, title, description, url, position })) });
  return prisma.trainingItem.findMany({ where: { organizationId: actor.organizationId }, orderBy: { position: "asc" }, include: { progress: { select: { userId: true } } } });
}

export async function setTrainingDone(actor: Actor, itemId: string, done: boolean) {
  const item = await prisma.trainingItem.findFirst({ where: { id: itemId, organizationId: actor.organizationId } });
  if (!item) throw new ValidationError("Item não encontrado.");
  if (done) await prisma.trainingProgress.upsert({ where: { itemId_userId: { itemId, userId: actor.userId } }, create: { itemId, userId: actor.userId }, update: {} });
  else await prisma.trainingProgress.deleteMany({ where: { itemId, userId: actor.userId } });
}

export async function addTrainingItem(actor: Actor, title: string, description: string, extra: { phase?: string; url?: string } = {}) {
  assertCan(actor, "users.manage");
  const t = title.trim();
  if (t.length < 3 || t.length > 150) throw new ValidationError("Informe o título (3 a 150 letras).");
  const last = await prisma.trainingItem.aggregate({ where: { organizationId: actor.organizationId }, _max: { position: true } });
  await prisma.trainingItem.create({ data: { organizationId: actor.organizationId, title: t, description: description.trim().slice(0, 500) || null, phase: extra.phase?.trim().slice(0, 40) || null, url: extra.url?.trim().slice(0, 500) || null, position: (last._max.position ?? -1) + 1 } });
}

export async function removeTrainingItem(actor: Actor, itemId: string) {
  assertCan(actor, "users.manage");
  await prisma.trainingItem.deleteMany({ where: { id: itemId, organizationId: actor.organizationId } });
}

export async function trainingTeam(actor: Actor) {
  assertCan(actor, "users.manage");
  const members = await prisma.membership.findMany({ where: { organizationId: actor.organizationId, active: true }, include: { user: { select: { id: true, name: true } } } });
  return members.map((m) => m.user);
}

export async function updateTrainingItem(actor: Actor, itemId: string, raw: { title?: unknown; description?: unknown; phase?: unknown; url?: unknown }) {
  assertCan(actor, "users.manage");
  const title = String(raw.title ?? "").trim();
  if (title.length < 3 || title.length > 150) throw new ValidationError("Informe o título (3 a 150 letras).");
  const url = String(raw.url ?? "").trim();
  if (url && !/^(https?:\/\/|\/)/i.test(url)) throw new ValidationError("O link deve começar com https:// ou /.");
  await prisma.trainingItem.updateMany({
    where: { id: itemId, organizationId: actor.organizationId },
    data: { title, description: String(raw.description ?? "").trim().slice(0, 500) || null, phase: String(raw.phase ?? "").trim().slice(0, 40) || null, url: url || null },
  });
}

/** Sobe (-1) ou desce (+1) o item na trilha. */
export async function moveTrainingItem(actor: Actor, itemId: string, dir: -1 | 1) {
  assertCan(actor, "users.manage");
  const all = await prisma.trainingItem.findMany({ where: { organizationId: actor.organizationId }, orderBy: { position: "asc" }, select: { id: true } });
  const i = all.findIndex((x) => x.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  const ids = all.map((x) => x.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await prisma.$transaction(ids.map((id, position) => prisma.trainingItem.update({ where: { id }, data: { position } })));
}
