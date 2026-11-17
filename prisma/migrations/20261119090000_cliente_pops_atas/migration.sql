-- CreateEnum
CREATE TYPE "ClientNoteKind" AS ENUM ('PARTICULARIDADE', 'ATA');

-- AlterTable
ALTER TABLE "Procedure" ADD COLUMN     "clientId" TEXT;

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "ClientNoteKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meetingDate" DATE,
    "participants" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientNote_clientId_kind_idx" ON "ClientNote"("clientId", "kind");

-- CreateIndex
CREATE INDEX "ClientNote_organizationId_idx" ON "ClientNote"("organizationId");

-- CreateIndex
CREATE INDEX "Procedure_clientId_idx" ON "Procedure"("clientId");

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

