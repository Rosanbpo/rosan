-- CreateTable
CREATE TABLE "JourneyStageStart" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stageIdx" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyStageStart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JourneyStageStart_organizationId_scope_slug_stageIdx_key" ON "JourneyStageStart"("organizationId", "scope", "slug", "stageIdx");

