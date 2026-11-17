import type { ClientNoteKind } from "@prisma/client";
import { dbDateToLocalDate, localDateToDbDate } from "@/domain/dates";
import { assertCan, NotFoundError, ValidationError, type Actor } from "@/domain/permissions";
import { prisma } from "../db";
import { clientNoteSchema, parseInput } from "../validation";
import { assertClientAccess } from "./access";
import { recordAudit } from "./audit";

/** Particularidades e atas de reunião do cliente. Quem tem acesso ao cliente pode ler e escrever. */
export async function listClientNotes(actor: Actor, clientId: string, kind: ClientNoteKind) {
  await assertClientAccess(actor, clientId);
  const rows = await prisma.clientNote.findMany({
    where: { organizationId: actor.organizationId, clientId, kind },
    orderBy: kind === "ATA" ? [{ meetingDate: "desc" }, { createdAt: "desc" }] : [{ updatedAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
  return rows.map((r) => ({ ...r, meetingDateLocal: r.meetingDate ? dbDateToLocalDate(r.meetingDate) : null }));
}

export async function getClientNote(actor: Actor, noteId: string) {
  const row = await prisma.clientNote.findFirst({ where: { id: noteId, organizationId: actor.organizationId } });
  if (!row) throw new NotFoundError("Registro não encontrado.");
  await assertClientAccess(actor, row.clientId);
  return { ...row, meetingDateLocal: row.meetingDate ? dbDateToLocalDate(row.meetingDate) : null };
}

const LABEL = { PARTICULARIDADE: "Particularidade", ATA: "Ata de reunião" } as const;

export async function createClientNote(actor: Actor, clientId: string, raw: unknown) {
  await assertClientAccess(actor, clientId);
  const input = parseInput(clientNoteSchema, raw);
  if (input.kind === "ATA" && !input.meetingDate) throw new ValidationError("Informe a data da reunião.", { meetingDate: "Informe a data da reunião." });
  return prisma.$transaction(async (tx) => {
    const row = await tx.clientNote.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        kind: input.kind,
        title: input.title,
        content: input.content,
        meetingDate: input.kind === "ATA" && input.meetingDate ? localDateToDbDate(input.meetingDate) : null,
        participants: input.participants ?? null,
        authorId: actor.userId,
      },
    });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: clientId,
      clientId,
      action: "client.note_created",
      summary: `${LABEL[input.kind]} registrada: ${input.title}`,
    });
    return row;
  });
}

export async function updateClientNote(actor: Actor, noteId: string, raw: unknown) {
  const current = await getClientNote(actor, noteId);
  const input = parseInput(clientNoteSchema, { ...(raw as object), kind: current.kind });
  await prisma.clientNote.update({
    where: { id: noteId },
    data: {
      title: input.title,
      content: input.content,
      meetingDate: current.kind === "ATA" && input.meetingDate ? localDateToDbDate(input.meetingDate) : current.meetingDate,
      participants: input.participants ?? null,
    },
  });
  return current;
}

export async function deleteClientNote(actor: Actor, noteId: string) {
  assertCan(actor, "clients.manage");
  const current = await getClientNote(actor, noteId);
  await prisma.$transaction(async (tx) => {
    await tx.clientNote.delete({ where: { id: noteId } });
    await recordAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      entityType: "Client",
      entityId: current.clientId,
      clientId: current.clientId,
      action: "client.note_deleted",
      summary: `${LABEL[current.kind]} removida: ${current.title}`,
    });
  });
  return current;
}
