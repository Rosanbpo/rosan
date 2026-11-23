-- AlterTable
ALTER TABLE "MarketingIdea" ADD COLUMN     "photoId" TEXT;

-- CreateTable
CREATE TABLE "MarketingBrand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "navy" TEXT NOT NULL DEFAULT '#0C1633',
    "gold" TEXT NOT NULL DEFAULT '#F0D5AA',
    "cream" TEXT NOT NULL DEFAULT '#FBF8F3',
    "brown" TEXT NOT NULL DEFAULT '#8E744F',
    "titleFont" TEXT NOT NULL DEFAULT 'inter',
    "bodyFont" TEXT NOT NULL DEFAULT 'inter',
    "style" TEXT NOT NULL DEFAULT 'MINIMALISTA',
    "guidelines" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPhoto" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingBrand_organizationId_key" ON "MarketingBrand"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingPhoto_organizationId_createdAt_idx" ON "MarketingPhoto"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketingBrand" ADD CONSTRAINT "MarketingBrand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPhoto" ADD CONSTRAINT "MarketingPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

