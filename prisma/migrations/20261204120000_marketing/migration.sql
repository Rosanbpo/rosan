-- CreateTable
CREATE TABLE "MarketingIdea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pillar" TEXT NOT NULL DEFAULT 'EDUCATIVO',
    "status" TEXT NOT NULL DEFAULT 'IDEIA',
    "slidesText" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "libraryKey" TEXT,
    "publishOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingIdea_organizationId_status_idx" ON "MarketingIdea"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingIdea_organizationId_libraryKey_key" ON "MarketingIdea"("organizationId", "libraryKey");

-- AddForeignKey
ALTER TABLE "MarketingIdea" ADD CONSTRAINT "MarketingIdea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

