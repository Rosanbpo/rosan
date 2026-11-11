-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('RASCUNHO', 'ASSINADO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "PricingSheet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costs" JSONB NOT NULL,
    "hoursPerDay" DECIMAL(5,2) NOT NULL,
    "daysPerMonth" INTEGER NOT NULL,
    "safetyFactor" DECIMAL(5,2) NOT NULL,
    "markup" DECIMAL(5,2) NOT NULL,
    "taxRate" DECIMAL(6,4) NOT NULL,
    "plans" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "proposalId" TEXT,
    "clientId" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'RASCUNHO',
    "partyName" TEXT NOT NULL,
    "partyDocument" TEXT,
    "partyAddress" TEXT,
    "repName" TEXT,
    "repCpf" TEXT,
    "issuerRepName" TEXT,
    "issuerRepRole" TEXT,
    "issuerRepCpf" TEXT,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "billingDay" INTEGER NOT NULL DEFAULT 10,
    "termMonths" INTEGER NOT NULL DEFAULT 6,
    "startDate" DATE,
    "signDate" DATE,
    "signCity" TEXT,
    "services" TEXT[],
    "volumes" TEXT[],
    "clauses" JSONB NOT NULL,
    "endDate" DATE,
    "pendingMonthly" DECIMAL(12,2),
    "unbilled" DECIMAL(12,2),
    "credits" DECIMAL(12,2),
    "settleDays" INTEGER,
    "distratoClauses" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingSheet_organizationId_key" ON "PricingSheet"("organizationId");

-- CreateIndex
CREATE INDEX "Contract_organizationId_status_idx" ON "Contract"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_organizationId_number_key" ON "Contract"("organizationId", "number");

-- AddForeignKey
ALTER TABLE "PricingSheet" ADD CONSTRAINT "PricingSheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

