import bcrypt from "bcryptjs";
import { z } from "zod";
import { instantToLocalDate, localDateToDbDate } from "@/domain/dates";
import { brazilianNationalHolidays } from "@/domain/holidays";
import { ValidationError } from "@/domain/permissions";
import { APP_TIMEZONE } from "../config";
import { prisma } from "../db";
import { DEFAULT_TEMPLATES } from "../defaults";
import { parseInput } from "../validation";

/** O primeiro acesso só está disponível enquanto não existe nenhum usuário. */
export async function needsFirstSetup(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}

const setupSchema = z.object({
  orgName: z.string().trim().min(2, "Informe o nome da empresa.").max(200),
  name: z.string().trim().min(2, "Informe seu nome.").max(200),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(10, "A senha deve ter ao menos 10 caracteres.").max(200),
});

/**
 * Cria a empresa, o primeiro administrador, os modelos de rotina iniciais e
 * os feriados nacionais do ano atual e do próximo. Executa uma única vez.
 */
export async function performFirstSetup(raw: unknown) {
  const input = parseInput(setupSchema, raw);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const year = Number(instantToLocalDate(new Date(), APP_TIMEZONE).slice(0, 4));
  await prisma.$transaction(async (tx) => {
    // Trava a tabela para que dois envios simultâneos não criem dois administradores.
    await tx.$executeRawUnsafe('LOCK TABLE "User" IN EXCLUSIVE MODE');
    if ((await tx.user.count()) > 0) throw new ValidationError("A configuração inicial já foi feita. Entre com seu usuário.");
    const org = await tx.organization.create({ data: { name: input.orgName } });
    const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
    for (const { checklist, ...t } of DEFAULT_TEMPLATES) {
      await tx.routineTemplate.create({
        data: {
          ...t,
          organizationId: org.id,
          checklistItems: { create: checklist.map(([label, required], position) => ({ label, required, position })) },
        },
      });
    }
    await tx.holiday.createMany({
      data: [year, year + 1].flatMap((y) =>
        brazilianNationalHolidays(y).map((h) => ({ organizationId: org.id, date: localDateToDbDate(h.date), name: h.name })),
      ),
      skipDuplicates: true,
    });
    await tx.auditEvent.create({
      data: {
        organizationId: org.id,
        actorId: user.id,
        entityType: "Organization",
        entityId: org.id,
        action: "org.created",
        summary: `Empresa "${org.name}" criada no primeiro acesso`,
      },
    });
  }, { timeout: 30_000 });
}
