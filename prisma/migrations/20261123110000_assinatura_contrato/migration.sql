-- CreateTable
CREATE TABLE "ContractSignLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "docHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "signerName" TEXT,
    "signerCpf" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerIp" TEXT,
    "signerAgent" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignLink_token_key" ON "ContractSignLink"("token");

-- CreateIndex
CREATE INDEX "ContractSignLink_contractId_idx" ON "ContractSignLink"("contractId");

