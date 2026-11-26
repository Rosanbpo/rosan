import { z } from "zod";
import { dbDateToLocalDate, type LocalDate } from "@/domain/dates";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { clientScope } from "./access";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 09:30").or(z.literal("")).optional();
const schema = z
  .object({
    title: z.string().trim().min(1, "Informe o título").max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
    startTime: time,
    endTime: time,
    notes: z.string().trim().max(2000).optional(),
    clientId: z.string().optional(),
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { message: "O fim precisa ser depois do início", path: ["endTime"] });

function parse(input: unknown) {
  const r = schema.safeParse(input);
  if (!r.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of r.error.issues) fieldErrors[String(i.path[0])] = i.message;
    throw new ValidationError(r.error.issues[0].message, fieldErrors);
  }
  const v = r.data;
  return { title: v.title, date: new Date(`${v.date}T00:00:00Z`), startTime: v.startTime || null, endTime: v.startTime ? v.endTime || null : null, notes: v.notes || null, clientId: v.clientId || null };
}

async function checkClient(actor: Actor, clientId: string | null) {
  if (!clientId) return;
  const ok = await prisma.client.count({ where: { id: clientId, ...clientScope(actor) } });
  if (!ok) throw new ValidationError("Cliente não encontrado", { clientId: "Cliente não encontrado" });
}

export async function createAppointment(actor: Actor, input: unknown) {
  assertCan(actor, "dashboard.view");
  const d = parse(input);
  await checkClient(actor, d.clientId);
  return prisma.appointment.create({ data: { ...d, organizationId: actor.organizationId, userId: actor.userId } });
}

async function own(actor: Actor, id: string) {
  const a = await prisma.appointment.findFirst({ where: { id, userId: actor.userId, organizationId: actor.organizationId } });
  if (!a) throw new NotFoundError("Compromisso não encontrado");
  return a;
}

export async function getAppointment(actor: Actor, id: string) {
  const a = await own(actor, id);
  return { ...a, localDate: dbDateToLocalDate(a.date) as LocalDate };
}

export async function updateAppointment(actor: Actor, id: string, input: unknown) {
  await own(actor, id);
  const d = parse(input);
  await checkClient(actor, d.clientId);
  return prisma.appointment.update({ where: { id }, data: d });
}

export async function deleteAppointment(actor: Actor, id: string) {
  await own(actor, id);
  await prisma.appointment.delete({ where: { id } });
}

export async function appointmentsBetween(actor: Actor, first: LocalDate, after: LocalDate) {
  return prisma.appointment.findMany({
    where: { userId: actor.userId, organizationId: actor.organizationId, date: { gte: new Date(`${first}T00:00:00Z`), lt: new Date(`${after}T00:00:00Z`) } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}
