-- CreateTable
CREATE TABLE "ClientDiagnosis" (
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT,
    "tokenCreatedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "submittedAt" TIMESTAMP(3),
    "regime" TEXT NOT NULL DEFAULT 'SIMPLES',
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankAccounts" INTEGER NOT NULL DEFAULT 0,
    "statementLines" INTEGER NOT NULL DEFAULT 0,
    "entries" INTEGER NOT NULL DEFAULT 0,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "inventory" BOOLEAN NOT NULL DEFAULT false,
    "multiCnpj" BOOLEAN NOT NULL DEFAULT false,
    "cardsAndMarketplaces" BOOLEAN NOT NULL DEFAULT false,
    "wantsReports" BOOLEAN NOT NULL DEFAULT true,
    "books" TEXT NOT NULL DEFAULT 'ORGANIZADA',
    "catchUpMonths" INTEGER NOT NULL DEFAULT 0,
    "banks" TEXT,
    "platforms" TEXT,
    "cards" TEXT,
    "notes" TEXT,
    "pricedFee" DECIMAL(12,2),
    "pricedHours" DECIMAL(8,2),
    "pricedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDiagnosis_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "ClientVolume" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "statementLines" INTEGER NOT NULL DEFAULT 0,
    "entries" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientVolume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientDiagnosis_token_key" ON "ClientDiagnosis"("token");

-- CreateIndex
CREATE INDEX "ClientVolume_organizationId_competence_idx" ON "ClientVolume"("organizationId", "competence");

-- CreateIndex
CREATE UNIQUE INDEX "ClientVolume_clientId_competence_key" ON "ClientVolume"("clientId", "competence");

-- AddForeignKey
ALTER TABLE "ClientDiagnosis" ADD CONSTRAINT "ClientDiagnosis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientVolume" ADD CONSTRAINT "ClientVolume_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

