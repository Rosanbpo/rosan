-- CreateTable
CREATE TABLE "LeadScript" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "checked" TEXT[],
    "notes" JSONB NOT NULL DEFAULT '{}',
    "finalNotes" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadScript_leadId_key" ON "LeadScript"("leadId");

-- AddForeignKey
ALTER TABLE "LeadScript" ADD CONSTRAINT "LeadScript_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

