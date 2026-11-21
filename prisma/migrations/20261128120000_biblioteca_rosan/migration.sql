-- AlterTable
ALTER TABLE "MessageTemplate" ADD COLUMN     "shared" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TrainingItem" ADD COLUMN     "phase" TEXT;

-- CreateTable
CREATE TABLE "LibraryAccess" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sections" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryAccess_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SystemMessageOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMessageOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemMessageOverride_organizationId_key_key" ON "SystemMessageOverride"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "LibraryAccess" ADD CONSTRAINT "LibraryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

