/**
 * Dados demonstrativos para DESENVOLVIMENTO. Todos os nomes são fictícios.
 * Não executa em produção. Usuários criados aqui são marcados como isDemo e
 * têm o login bloqueado quando NODE_ENV=production.
 */
import bcrypt from "bcryptjs";
import { PrismaClient, type Client, type Prisma } from "@prisma/client";
import { addDays, instantToLocalDate, localDateTimeToInstant, localDateToDbDate } from "../src/domain/dates";
import { brazilianNationalHolidays } from "../src/domain/holidays";
import { runScheduler } from "../src/server/services/generator";
import { DEFAULT_TEMPLATES } from "../src/server/defaults";

const TZ = "America/Sao_Paulo";
const PASSWORD = "demo1234";
const DOMAIN = "demo.centralbpo.test";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PRODUCTION !== "true") {
  console.error("Seed de demonstração bloqueado em produção.");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const existing = await db.user.findUnique({ where: { email: `admin@${DOMAIN}` } });
  if (existing) {
    console.log("Dados demonstrativos já existem. Para recriar: npx prisma migrate reset");
    return;
  }

  const now = new Date();
  const today = instantToLocalDate(now, TZ);
  const at = (days: number, time = "18:00") => localDateTimeToInstant(addDays(today, days), time, TZ);

  const org = await db.organization.create({ data: { name: "Exemplo BPO Financeiro (demonstração)" } });
  const hash = await bcrypt.hash(PASSWORD, 10);
  const mk = async (name: string, local: string, role: "ADMIN" | "GESTOR" | "OPERADOR") => {
    const user = await db.user.create({ data: { name, email: `${local}@${DOMAIN}`, passwordHash: hash, isDemo: true } });
    await db.membership.create({ data: { userId: user.id, organizationId: org.id, role } });
    return user;
  };
  const admin = await mk("Ana Administradora", "admin", "ADMIN");
  const gestor = await mk("Gustavo Gestor", "gestor", "GESTOR");
  const op1 = await mk("Olívia Operadora", "operador1", "OPERADOR");
  const op2 = await mk("Otávio Operador", "operador2", "OPERADOR");
  const op3 = await mk("Paula Operadora", "operador3", "OPERADOR");

  // Feriados nacionais (sugestão do sistema) para o ano atual e o próximo
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    await db.holiday.createMany({
      data: brazilianNationalHolidays(y).map((h) => ({ organizationId: org.id, date: localDateToDbDate(h.date), name: h.name })),
      skipDuplicates: true,
    });
  }

  const templates: Record<string, string> = {};
  for (const { checklist, ...t } of DEFAULT_TEMPLATES) {
    const created = await db.routineTemplate.create({
      data: {
        ...t,
        organizationId: org.id,
        checklistItems: { create: checklist.map(([label, required], position) => ({ label, required, position })) },
      },
    });
    templates[t.name] = created.id;
  }

  const clientsData = [
    { tradeName: "Padaria Pão Dourado", legalName: "Pão Dourado Panificadora Ltda (fictícia)", status: "ATIVO", op: op1 },
    { tradeName: "Clínica Bem Viver", legalName: "Bem Viver Serviços de Saúde Ltda (fictícia)", status: "ATIVO", op: op1 },
    { tradeName: "Oficina Roda Firme", legalName: "Roda Firme Mecânica ME (fictícia)", status: "ATIVO", op: op2 },
    { tradeName: "Loja Estilo Urbano", legalName: "Estilo Urbano Comércio de Roupas Ltda (fictícia)", status: "IMPLANTACAO", op: op3 },
    { tradeName: "Escola Saber Mais", legalName: "Saber Mais Educação Infantil Ltda (fictícia)", status: "ATIVO", op: op2 },
  ] as const;

  const clients: Client[] = [];
  for (const c of clientsData) {
    const members = [c.op.id, gestor.id, ...(c.op.id === op1.id ? [op3.id] : [])];
    clients.push(
      await db.client.create({
        data: {
          organizationId: org.id,
          tradeName: c.tradeName,
          legalName: c.legalName,
          status: c.status,
          contactName: "Contato Fictício",
          contactEmail: `financeiro@${c.tradeName.toLowerCase().replace(/[^a-z]/g, "")}.exemplo.test`,
          contactPhone: "(00) 0000-0000",
          contactChannels: "E-mail e grupo de mensagens",
          services: ["Contas a pagar", "Contas a receber", "Conciliação bancária", "Fluxo de caixa", "Relatórios gerenciais"],
          startDate: localDateToDbDate(addDays(today, -200)),
          notes: "Exemplo: extratos disponíveis a partir das 9h. Não registrar senhas neste campo.",
          responsibleOperatorId: c.op.id,
          managerId: gestor.id,
          members: { create: [...new Set(members)].map((userId) => ({ userId })) },
        },
      }),
    );
  }

  // Recorrências: começam "hoje" (generationFloor) para gerar as próximas ocorrências
  const floor = localDateToDbDate(addDays(today, -1));
  const rec = async (clientIdx: number, templateName: string, extra: Partial<Prisma.RecurrenceUncheckedCreateInput> = {}) => {
    const t = await db.routineTemplate.findUniqueOrThrow({ where: { id: templates[templateName] } });
    return db.recurrence.create({
      data: {
        organizationId: org.id,
        clientId: clients[clientIdx].id,
        templateId: t.id,
        frequency: t.frequency,
        weekdays: t.weekdays,
        monthDays: t.monthDays,
        nthBusinessDay: t.nthBusinessDay,
        dueTime: t.dueTime,
        leadDays: t.leadDays,
        startOffsetDays: t.startOffsetDays,
        nonBusinessDayRule: t.nonBusinessDayRule,
        startDate: localDateToDbDate(addDays(today, -60)),
        generationFloor: floor,
        ...extra,
      },
    });
  };
  for (let i = 0; i < 3; i++) await rec(i, "Conciliação bancária diária");
  await rec(0, "Preparação da agenda de pagamentos", { reviewerId: gestor.id });
  await rec(1, "Acompanhamento de recebimentos");
  await rec(2, "Cobrança de inadimplentes");
  await rec(0, "Atualização do fluxo de caixa");
  await rec(4, "Atualização do fluxo de caixa");
  for (const i of [0, 1, 2, 4]) await rec(i, "Fechamento financeiro mensal", { reviewerId: gestor.id });
  await rec(1, "Preparação de relatório gerencial", { reviewerId: gestor.id });
  await rec(0, "Reunião mensal de resultados", { assigneeId: gestor.id });
  await rec(4, "Solicitação de documentos");
  await rec(3, "Solicitação de documentos", { status: "PAUSED" });

  // Tarefas manuais em diferentes situações
  const task = async (data: Omit<Prisma.TaskUncheckedCreateInput, "organizationId">, checklist: Array<[string, boolean, boolean]> = []) => {
    const t = await db.task.create({
      data: {
        organizationId: org.id,
        createdById: gestor.id,
        ...data,
        checklistItems: {
          create: checklist.map(([label, required, done], position) => ({
            label,
            required,
            done,
            position,
            doneById: done ? (data.assigneeId as string) : null,
            doneAt: done ? now : null,
          })),
        },
      },
    });
    await db.auditEvent.create({
      data: {
        organizationId: org.id,
        actorId: gestor.id,
        entityType: "Task",
        entityId: t.id,
        taskId: t.id,
        clientId: t.clientId,
        action: "task.created",
        summary: "Tarefa criada manualmente (dados demonstrativos)",
      },
    });
    return t;
  };

  await task(
    { clientId: clients[0].id, title: "Pagar fornecedores da semana — conferir boletos", category: "CONTAS_A_PAGAR", priority: "CRITICA", status: "EM_ANDAMENTO", assigneeId: op1.id, dueAt: at(-2, "12:00"), startAt: at(-3, "08:00"), estimatedMinutes: 60 },
    [["Conferir boletos recebidos", true, true], ["Enviar relação para aprovação", true, false]],
  );
  await task({ clientId: clients[2].id, title: "Revisar classificação de despesas do trimestre", category: "OUTRAS", priority: "ALTA", status: "A_FAZER", assigneeId: op2.id, dueAt: at(-1, "18:00"), estimatedMinutes: 90 });
  await task({ clientId: clients[1].id, title: "Emitir relatório de contas a receber", category: "CONTAS_A_RECEBER", priority: "NORMAL", status: "A_FAZER", assigneeId: op1.id, dueAt: at(0, "17:00"), estimatedMinutes: 30 });
  await task({ clientId: clients[4].id, title: "Atualizar cadastro de alunos inadimplentes", category: "COBRANCA", priority: "NORMAL", status: "A_FAZER", assigneeId: op2.id, dueAt: at(0, "23:00") });
  await task({ clientId: clients[3].id, title: "Mapear contas bancárias e acessos (implantação)", category: "IMPLANTACAO", priority: "ALTA", status: "A_FAZER", assigneeId: op3.id, dueAt: at(3, "18:00"), estimatedMinutes: 120 }, [
    ["Listar bancos e contas", true, false],
    ["Solicitar acessos de consulta", true, false],
  ]);
  await task({ clientId: clients[0].id, title: "Organizar pasta de notas fiscais", category: "DOCUMENTACAO", priority: "BAIXA", status: "A_FAZER", assigneeId: null, dueAt: at(5, "18:00") });

  // Aguardando cliente (com pendência)
  const waiting = await task({ clientId: clients[1].id, title: "Conciliar cartão de crédito corporativo", category: "CONCILIACAO_BANCARIA", priority: "ALTA", status: "AGUARDANDO_CLIENTE", assigneeId: op1.id, dueAt: at(1, "18:00") });
  await db.pending.create({
    data: { organizationId: org.id, clientId: clients[1].id, taskId: waiting.id, type: "CLIENTE", reason: "Fatura do cartão do mês anterior (PDF)", respondent: "Financeiro do cliente", requestedAt: at(-4, "10:00"), followUpAt: localDateToDbDate(today), createdById: op1.id },
  });
  const waiting2 = await task({ clientId: clients[2].id, title: "Regularizar tarifa bancária cobrada em duplicidade", category: "CONCILIACAO_BANCARIA", priority: "NORMAL", status: "AGUARDANDO_TERCEIRO", assigneeId: op2.id, dueAt: at(-1, "18:00") });
  await db.pending.create({
    data: { organizationId: org.id, clientId: clients[2].id, taskId: waiting2.id, type: "TERCEIRO", reason: "Retorno do gerente do banco sobre estorno", respondent: "Gerente da agência", requestedAt: at(-6, "15:00"), followUpAt: localDateToDbDate(addDays(today, 2)), createdById: op2.id },
  });

  // Em revisão
  await task(
    { clientId: clients[0].id, title: "Relatório de despesas por centro de custo", category: "RELATORIOS_GERENCIAIS", priority: "NORMAL", status: "EM_REVISAO", assigneeId: op1.id, reviewerId: gestor.id, executedById: op1.id, executedAt: at(-1, "16:00"), dueAt: at(1, "18:00") },
    [["Gerar relatório", true, true], ["Revisar totais", true, true]],
  );
  // Devolvida pelo revisor
  const returned = await task(
    { clientId: clients[4].id, title: "Fluxo de caixa projetado — próximo trimestre", category: "FLUXO_DE_CAIXA", priority: "ALTA", status: "EM_ANDAMENTO", assigneeId: op2.id, reviewerId: gestor.id, returnCount: 1, lastReturnReason: "Faltou considerar a rematrícula prevista para o próximo mês.", dueAt: at(2, "18:00") },
    [["Projetar entradas", true, true], ["Projetar saídas", true, true]],
  );
  await db.comment.create({ data: { taskId: returned.id, authorId: gestor.id, body: "Devolver ao operador: Faltou considerar a rematrícula prevista para o próximo mês." } });

  // Concluídas (no prazo e com atraso) para o indicador
  for (let i = 1; i <= 6; i++) {
    const due = at(-i * 2, "18:00");
    const late = i % 3 === 0;
    await task({
      clientId: clients[i % 5].id,
      title: `Conferência de lançamentos (exemplo concluído ${i})`,
      category: "CONTAS_A_PAGAR",
      priority: "NORMAL",
      status: "CONCLUIDA",
      assigneeId: [op1, op2, op3][i % 3].id,
      executedById: [op1, op2, op3][i % 3].id,
      completedById: [op1, op2, op3][i % 3].id,
      dueAt: due,
      executedAt: new Date(due.getTime() + (late ? 86_400_000 : -3_600_000)),
      completedAt: new Date(due.getTime() + (late ? 86_400_000 : -3_600_000)),
    });
  }
  await task({ clientId: clients[3].id, title: "Reunião de kick-off (cancelada pelo cliente)", category: "REUNIAO_CLIENTE", priority: "NORMAL", status: "CANCELADA", assigneeId: gestor.id, dueAt: at(-5, "10:00") });

  const summary = await runScheduler({ trigger: "seed", db });
  console.log(`Tarefas recorrentes geradas: ${summary.created}`);
  console.log("\nUsuários de demonstração (senha: demo1234):");
  for (const u of [admin, gestor, op1, op2, op3]) console.log(`  ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
