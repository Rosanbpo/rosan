-- CreateTable
CREATE TABLE "SchedulerLock" (
    "id" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "holder" TEXT,

    CONSTRAINT "SchedulerLock_pkey" PRIMARY KEY ("id")
);
