-- AlterTable
ALTER TABLE "ClientNps" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'EQUIPE';

-- CreateTable
CREATE TABLE "NpsLink" (
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsLink_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "ClientChurn" (
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "monthlyFee" DECIMAL(12,2),
    "monthsActive" INTEGER,
    "leftAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "ClientChurn_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NpsLink_token_key" ON "NpsLink"("token");

-- CreateIndex
CREATE INDEX "ClientChurn_organizationId_leftAt_idx" ON "ClientChurn"("organizationId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_organizationId_kind_key" ON "ChecklistTemplate"("organizationId", "kind");

-- AddForeignKey
ALTER TABLE "NpsLink" ADD CONSTRAINT "NpsLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientChurn" ADD CONSTRAINT "ClientChurn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

