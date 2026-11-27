-- CreateEnum
CREATE TYPE "ServiceLine" AS ENUM ('BPO_FINANCEIRO', 'CONSULTORIA_PF');

-- CreateEnum
CREATE TYPE "PfStatus" AS ENUM ('NOVO_INTERESSADO', 'AGUARDANDO_CONTRATACAO', 'CONTRATACAO_CONFIRMADA', 'AGUARDANDO_DIAGNOSTICO', 'DIAGNOSTICO_EM_PREPARACAO', 'PRIMEIRA_REUNIAO_AGENDADA', 'DIAGNOSTICO_REALIZADO', 'PLANEJAMENTO_EM_ELABORACAO', 'SEGUNDA_REUNIAO_AGENDADA', 'CONSULTORIA_CONCLUIDA', 'AGUARDANDO_DECISAO', 'ATIVO_APLICATIVO', 'ATIVO_ACOMPANHAMENTO');

-- CreateEnum
CREATE TYPE "PfContinuity" AS ENUM ('SEGUIR_SOZINHO', 'ACOMPANHAMENTO_MENSAL');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "serviceLines" "ServiceLine"[] DEFAULT ARRAY['BPO_FINANCEIRO']::"ServiceLine"[];

-- CreateTable
CREATE TABLE "PfJourney" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "PfStatus" NOT NULL DEFAULT 'NOVO_INTERESSADO',
    "startDate" DATE,
    "meeting1At" DATE,
    "meeting2At" DATE,
    "appBonusStart" DATE,
    "continuity" "PfContinuity",
    "paidAt" DATE,
    "doneItems" TEXT[],
    "appInvitedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PfJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PfJourneyEvent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "actorId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PfJourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PfJourney_clientId_key" ON "PfJourney"("clientId");

-- CreateIndex
CREATE INDEX "PfJourney_organizationId_status_idx" ON "PfJourney"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PfJourneyEvent_journeyId_createdAt_idx" ON "PfJourneyEvent"("journeyId", "createdAt");

-- AddForeignKey
ALTER TABLE "PfJourney" ADD CONSTRAINT "PfJourney_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PfJourneyEvent" ADD CONSTRAINT "PfJourneyEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "PfJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

