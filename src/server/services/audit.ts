import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

export interface AuditInput {
  organizationId: string;
  actorId: string | null;
  entityType: "Task" | "Client" | "RoutineTemplate" | "Recurrence" | "User" | "Holiday" | "Organization";
  entityId: string;
  action: string;
  summary: string;
  taskId?: string | null;
  clientId?: string | null;
  changes?: Prisma.InputJsonValue;
}

export async function recordAudit(db: Db, input: AuditInput) {
  await db.auditEvent.create({ data: { ...input, changes: input.changes ?? undefined } });
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  return value ?? null;
}

/** Campos alterados entre dois objetos, no formato { campo: { de, para } }. */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: readonly (keyof T)[],
): Record<string, { de: unknown; para: unknown }> {
  const changes: Record<string, { de: unknown; para: unknown }> = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field as string] = { de: from, para: to };
  }
  return changes;
}
