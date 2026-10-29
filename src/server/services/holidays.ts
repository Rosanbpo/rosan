import { dbDateToLocalDate, localDateToDbDate } from "@/domain/dates";
import { brazilianNationalHolidays } from "@/domain/holidays";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { holidaySchema, parseInput } from "../validation";
import { recordAudit } from "./audit";

export async function listHolidays(actor: Actor, year: number) {
  const rows = await prisma.holiday.findMany({
    where: {
      organizationId: actor.organizationId,
      date: { gte: localDateToDbDate(`${year}-01-01`), lte: localDateToDbDate(`${year}-12-31`) },
    },
    orderBy: { date: "asc" },
  });
  return rows.map((h) => ({ ...h, localDate: dbDateToLocalDate(h.date) }));
}

export async function addHoliday(actor: Actor, raw: unknown) {
  assertCan(actor, "org.settings");
  const input = parseInput(holidaySchema, raw);
  const exists = await prisma.holiday.findUnique({
    where: { organizationId_date: { organizationId: actor.organizationId, date: localDateToDbDate(input.date) } },
  });
  if (exists) throw new ValidationError("Já existe um feriado nesta data.", { date: "Data já cadastrada." });
  await prisma.$transaction(async (tx) => {
    const h = await tx.holiday.create({
      data: { organizationId: actor.organizationId, date: localDateToDbDate(input.date), name: input.name },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Holiday",
      entityId: h.id,
      action: "holiday.created",
      summary: `Feriado ${input.date.split("-").reverse().join("/")} — ${input.name} cadastrado`,
    });
  });
}

export async function removeHoliday(actor: Actor, id: string) {
  assertCan(actor, "org.settings");
  const h = await prisma.holiday.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!h) throw new NotFoundError();
  await prisma.$transaction(async (tx) => {
    await tx.holiday.delete({ where: { id } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Holiday",
      entityId: id,
      action: "holiday.removed",
      summary: `Feriado ${dbDateToLocalDate(h.date).split("-").reverse().join("/")} — ${h.name} removido`,
    });
  });
}

/** Inclui os feriados nacionais calculados para o ano (sem sobrescrever os existentes). */
export async function importNationalHolidays(actor: Actor, year: number, includeOptional: boolean) {
  assertCan(actor, "org.settings");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new ValidationError("Ano inválido.");
  const list = brazilianNationalHolidays(year, includeOptional);
  const res = await prisma.holiday.createMany({
    data: list.map((h) => ({ organizationId: actor.organizationId, date: localDateToDbDate(h.date), name: h.name })),
    skipDuplicates: true,
  });
  await recordAudit(prisma, {
    organizationId: actor.organizationId,
    actorId: actor.userId,
    entityType: "Holiday",
    entityId: String(year),
    action: "holiday.imported",
    summary: `${res.count} feriado(s) nacional(is) de ${year} incluído(s)`,
  });
  return res.count;
}
