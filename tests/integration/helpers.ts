import bcrypt from "bcryptjs";
import type { Role } from "@/domain/enums";
import type { Actor } from "@/domain/permissions";
import { prisma } from "@/server/db";

export async function resetDb() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let seq = 0;
export async function makeOrg(name = "Org Teste") {
  return prisma.organization.create({ data: { name } });
}

export async function makeUser(organizationId: string, role: Role, name = `${role} ${++seq}`): Promise<Actor> {
  const user = await prisma.user.create({
    data: { name, email: `u${Date.now()}${++seq}@teste.test`, passwordHash: await bcrypt.hash("x", 4) },
  });
  await prisma.membership.create({ data: { userId: user.id, organizationId, role } });
  return { userId: user.id, organizationId, role, name };
}

export async function setupOrg() {
  const org = await makeOrg();
  const admin = await makeUser(org.id, "ADMIN");
  const gestor = await makeUser(org.id, "GESTOR");
  const op = await makeUser(org.id, "OPERADOR");
  const op2 = await makeUser(org.id, "OPERADOR");
  return { org, admin, gestor, op, op2 };
}
