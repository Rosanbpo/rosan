-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTOR', 'OPERADOR');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('IMPLANTACAO', 'ATIVO', 'PAUSADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('CONTAS_A_PAGAR', 'CONTAS_A_RECEBER', 'CONCILIACAO_BANCARIA', 'COBRANCA', 'FLUXO_DE_CAIXA', 'DOCUMENTACAO', 'FECHAMENTO_MENSAL', 'RELATORIOS_GERENCIAIS', 'REUNIAO_CLIENTE', 'IMPLANTACAO', 'OUTRAS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY_BUSINESS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY_DAY', 'MONTHLY_NTH_BUSINESS_DAY');

-- CreateEnum
CREATE TYPE "NonBusinessDayRule" AS ENUM ('ANTICIPATE', 'POSTPONE');

-- CreateEnum
CREATE TYPE "CompetenceRule" AS ENUM ('NONE', 'CURRENT_MONTH', 'PREVIOUS_MONTH');

-- CreateEnum
CREATE TYPE "RecurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_TERCEIRO', 'EM_REVISAO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TaskOrigin" AS ENUM ('MANUAL', 'RECORRENTE');

-- CreateEnum
CREATE TYPE "PendingType" AS ENUM ('CLIENTE', 'TERCEIRO');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactChannels" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'IMPLANTACAO',
    "services" TEXT[],
    "startDate" DATE,
    "notes" TEXT,
    "responsibleOperatorId" TEXT,
    "managerId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMember" (
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMember_pkey" PRIMARY KEY ("clientId","userId")
);

-- CreateTable
CREATE TABLE "RoutineTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "estimatedMinutes" INTEGER,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "competenceRule" "CompetenceRule" NOT NULL DEFAULT 'NONE',
    "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY_DAY',
    "weekdays" INTEGER[],
    "monthDays" INTEGER[],
    "nthBusinessDay" INTEGER,
    "dueTime" TEXT NOT NULL DEFAULT '18:00',
    "leadDays" INTEGER NOT NULL DEFAULT 3,
    "startOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "nonBusinessDayRule" "NonBusinessDayRule" NOT NULL DEFAULT 'POSTPONE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateChecklistItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurrence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "RecurrenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "Frequency" NOT NULL,
    "weekdays" INTEGER[],
    "monthDays" INTEGER[],
    "nthBusinessDay" INTEGER,
    "dueTime" TEXT NOT NULL DEFAULT '18:00',
    "leadDays" INTEGER NOT NULL DEFAULT 3,
    "startOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "nonBusinessDayRule" "NonBusinessDayRule" NOT NULL DEFAULT 'POSTPONE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "generationFloor" DATE NOT NULL,
    "assigneeId" TEXT,
    "reviewerId" TEXT,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'A_FAZER',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "competence" TEXT,
    "startAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "estimatedMinutes" INTEGER,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "origin" "TaskOrigin" NOT NULL DEFAULT 'MANUAL',
    "recurrenceId" TEXT,
    "occurrenceKey" TEXT,
    "assigneeId" TEXT,
    "reviewerId" TEXT,
    "createdById" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "returnCount" INTEGER NOT NULL DEFAULT 0,
    "lastReturnReason" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pending" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "PendingType" NOT NULL,
    "reason" TEXT NOT NULL,
    "respondent" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followUpAt" DATE NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedById" TEXT,

    CONSTRAINT "Pending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "taskId" TEXT,
    "clientId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "trigger" TEXT NOT NULL,

    CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Client_organizationId_status_idx" ON "Client"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Client_organizationId_tradeName_idx" ON "Client"("organizationId", "tradeName");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_cnpj_key" ON "Client"("organizationId", "cnpj");

-- CreateIndex
CREATE INDEX "ClientMember_userId_idx" ON "ClientMember"("userId");

-- CreateIndex
CREATE INDEX "RoutineTemplate_organizationId_archivedAt_idx" ON "RoutineTemplate"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "TemplateChecklistItem_templateId_position_idx" ON "TemplateChecklistItem"("templateId", "position");

-- CreateIndex
CREATE INDEX "Recurrence_organizationId_status_idx" ON "Recurrence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Recurrence_clientId_idx" ON "Recurrence"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_organizationId_date_key" ON "Holiday"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Task_organizationId_status_dueAt_idx" ON "Task"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_organizationId_assigneeId_status_idx" ON "Task"("organizationId", "assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_organizationId_clientId_status_idx" ON "Task"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "Task_organizationId_reviewerId_status_idx" ON "Task"("organizationId", "reviewerId", "status");

-- CreateIndex
CREATE INDEX "Task_organizationId_category_idx" ON "Task"("organizationId", "category");

-- CreateIndex
CREATE INDEX "Task_organizationId_completedAt_idx" ON "Task"("organizationId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurrenceId_occurrenceKey_key" ON "Task"("recurrenceId", "occurrenceKey");

-- CreateIndex
CREATE INDEX "ChecklistItem_taskId_position_idx" ON "ChecklistItem"("taskId", "position");

-- CreateIndex
CREATE INDEX "Comment_taskId_createdAt_idx" ON "Comment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Evidence_taskId_idx" ON "Evidence"("taskId");

-- CreateIndex
CREATE INDEX "Pending_organizationId_resolvedAt_followUpAt_idx" ON "Pending"("organizationId", "resolvedAt", "followUpAt");

-- CreateIndex
CREATE INDEX "Pending_taskId_idx" ON "Pending"("taskId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_taskId_createdAt_idx" ON "AuditEvent"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_clientId_createdAt_idx" ON "AuditEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SchedulerRun_startedAt_idx" ON "SchedulerRun"("startedAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_responsibleOperatorId_fkey" FOREIGN KEY ("responsibleOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMember" ADD CONSTRAINT "ClientMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMember" ADD CONSTRAINT "ClientMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineTemplate" ADD CONSTRAINT "RoutineTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateChecklistItem" ADD CONSTRAINT "TemplateChecklistItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RoutineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RoutineTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pending" ADD CONSTRAINT "Pending_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pending" ADD CONSTRAINT "Pending_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pending" ADD CONSTRAINT "Pending_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pending" ADD CONSTRAINT "Pending_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pending" ADD CONSTRAINT "Pending_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerRun" ADD CONSTRAINT "SchedulerRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
