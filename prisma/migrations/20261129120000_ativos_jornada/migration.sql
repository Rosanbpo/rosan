-- CreateTable
CREATE TABLE "JourneyAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "url" TEXT,
    "stage" TEXT NOT NULL,
    "taskRefs" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JourneyAsset_organizationId_stage_idx" ON "JourneyAsset"("organizationId", "stage");

