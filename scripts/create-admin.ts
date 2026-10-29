/**
 * Cria a empresa de BPO e o primeiro administrador (uso em produção).
 * Uso:
 *   ADMIN_PASSWORD='senha-forte' npm run admin:create -- --org "Minha BPO" --name "Fulano" --email fulano@empresa.com.br
 * A senha é lida da variável ADMIN_PASSWORD para não ficar no histórico do shell.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const orgName = arg("org");
  const name = arg("name");
  const email = arg("email")?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!orgName || !name || !email || !password) {
    console.error('Informe --org, --name, --email e a variável ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Use uma senha com pelo menos 10 caracteres.");
    process.exit(1);
  }
  const db = new PrismaClient();
  try {
    if (await db.user.findUnique({ where: { email } })) {
      console.error("Já existe usuário com este e-mail.");
      process.exit(1);
    }
    const org = await db.organization.create({ data: { name: orgName } });
    const user = await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });
    await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
    console.log(`Empresa "${org.name}" e administrador ${email} criados.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
