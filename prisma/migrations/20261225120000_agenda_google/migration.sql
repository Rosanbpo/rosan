-- CreateTable
CREATE TABLE "AgendaImport" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaImport_pkey" PRIMARY KEY ("userId")
);

