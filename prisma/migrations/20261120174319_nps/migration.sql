-- CreateTable
CREATE TABLE "ClientNps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "ClientNps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientNps_clientId_answeredAt_idx" ON "ClientNps"("clientId", "answeredAt");

-- CreateIndex
CREATE INDEX "ClientNps_organizationId_answeredAt_idx" ON "ClientNps"("organizationId", "answeredAt");

-- AddForeignKey
ALTER TABLE "ClientNps" ADD CONSTRAINT "ClientNps_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

