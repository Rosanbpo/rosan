-- CreateEnum
CREATE TYPE "VaultCategory" AS ENUM ('BANCO', 'SISTEMA', 'EMAIL', 'CERTIFICADO', 'OUTRO');

-- CreateTable
CREATE TABLE "ClientVaultItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" "VaultCategory" NOT NULL DEFAULT 'OUTRO',
    "label" TEXT NOT NULL,
    "url" TEXT,
    "username" TEXT,
    "secretEnc" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientVaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientVaultItem_clientId_idx" ON "ClientVaultItem"("clientId");

-- CreateIndex
CREATE INDEX "ClientVaultItem_organizationId_idx" ON "ClientVaultItem"("organizationId");

-- AddForeignKey
ALTER TABLE "ClientVaultItem" ADD CONSTRAINT "ClientVaultItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientVaultItem" ADD CONSTRAINT "ClientVaultItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

