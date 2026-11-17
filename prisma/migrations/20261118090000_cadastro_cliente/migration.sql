-- Cadastro do cliente: etapa, software, custo direto e contas bancárias. Somente aditivo.
ALTER TABLE "Client" ADD COLUMN "journeyStage" "JourneyStage";
ALTER TABLE "Client" ADD COLUMN "software" TEXT;
ALTER TABLE "Client" ADD COLUMN "directCost" DECIMAL(12,2);

CREATE TABLE "ClientBankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "agency" TEXT,
    "account" TEXT,
    "kind" TEXT,
    "nickname" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientBankAccount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientBankAccount_clientId_archivedAt_idx" ON "ClientBankAccount"("clientId", "archivedAt");
CREATE INDEX "ClientBankAccount_organizationId_idx" ON "ClientBankAccount"("organizationId");
ALTER TABLE "ClientBankAccount" ADD CONSTRAINT "ClientBankAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
