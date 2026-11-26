-- CreateTable
CREATE TABLE "DayGoalTask" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayGoalTask_pkey" PRIMARY KEY ("userId","date","taskId")
);

-- CreateIndex
CREATE INDEX "DayGoalTask_taskId_idx" ON "DayGoalTask"("taskId");

