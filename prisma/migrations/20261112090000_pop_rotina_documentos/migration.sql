-- POP vinculado ao modelo de rotina
ALTER TABLE "RoutineTemplate" ADD COLUMN "procedureId" TEXT;
ALTER TABLE "RoutineTemplate" ADD CONSTRAINT "RoutineTemplate_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "RoutineTemplate_procedureId_idx" ON "RoutineTemplate"("procedureId");

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DocumentReceipt" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "note" TEXT,
    CONSTRAINT "DocumentReceipt_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "DocumentRequirement_clientId_archivedAt_idx" ON "DocumentRequirement"("clientId", "archivedAt");
-- CreateIndex
CREATE INDEX "DocumentRequirement_organizationId_idx" ON "DocumentRequirement"("organizationId");
-- CreateIndex
CREATE INDEX "DocumentReceipt_competence_idx" ON "DocumentReceipt"("competence");
-- CreateIndex
CREATE UNIQUE INDEX "DocumentReceipt_requirementId_competence_key" ON "DocumentReceipt"("requirementId", "competence");
-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "DocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
