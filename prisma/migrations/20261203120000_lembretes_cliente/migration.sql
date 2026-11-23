-- CreateTable
CREATE TABLE "ClientReminder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "taskId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientReminder_clientId_done_idx" ON "ClientReminder"("clientId", "done");

-- CreateIndex
CREATE INDEX "ClientReminder_organizationId_idx" ON "ClientReminder"("organizationId");

-- AddForeignKey
ALTER TABLE "ClientReminder" ADD CONSTRAINT "ClientReminder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReminder" ADD CONSTRAINT "ClientReminder_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

