-- CreateTable
CREATE TABLE "ClientLogo" (
    "clientId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "ClientClosing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingItem" (
    "id" TEXT NOT NULL,
    "closingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "note" TEXT,

    CONSTRAINT "ClosingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientClosing_organizationId_competence_idx" ON "ClientClosing"("organizationId", "competence");

-- CreateIndex
CREATE UNIQUE INDEX "ClientClosing_clientId_competence_key" ON "ClientClosing"("clientId", "competence");

-- CreateIndex
CREATE INDEX "ClosingItem_closingId_idx" ON "ClosingItem"("closingId");

-- AddForeignKey
ALTER TABLE "ClientLogo" ADD CONSTRAINT "ClientLogo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientClosing" ADD CONSTRAINT "ClientClosing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientClosing" ADD CONSTRAINT "ClientClosing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingItem" ADD CONSTRAINT "ClosingItem_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "ClientClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingItem" ADD CONSTRAINT "ClosingItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

