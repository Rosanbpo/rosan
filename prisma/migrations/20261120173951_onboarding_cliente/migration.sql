-- CreateTable
CREATE TABLE "ClientOnboarding" (
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "goals" TEXT,
    "ourResponsibilities" TEXT,
    "clientResponsibilities" TEXT,
    "officialChannel" TEXT,
    "erp" TEXT,
    "defaultEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOnboarding_pkey" PRIMARY KEY ("clientId")
);

-- AddForeignKey
ALTER TABLE "ClientOnboarding" ADD CONSTRAINT "ClientOnboarding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

