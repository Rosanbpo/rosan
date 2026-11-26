-- CreateEnum
CREATE TYPE "PortalUserStatus" AS ENUM ('CONVIDADO', 'ATIVO', 'SUSPENSO');

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "PortalUserStatus" NOT NULL DEFAULT 'CONVIDADO',
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAccess" (
    "portalUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PortalAccess_pkey" PRIMARY KEY ("portalUserId","clientId")
);

-- CreateTable
CREATE TABLE "PortalSession" (
    "id" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,

    CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_inviteTokenHash_key" ON "PortalUser"("inviteTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_resetTokenHash_key" ON "PortalUser"("resetTokenHash");

-- CreateIndex
CREATE INDEX "PortalUser_organizationId_idx" ON "PortalUser"("organizationId");

-- CreateIndex
CREATE INDEX "PortalAccess_clientId_idx" ON "PortalAccess"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSession_tokenHash_key" ON "PortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_portalUserId_idx" ON "PortalSession"("portalUserId");

-- AddForeignKey
ALTER TABLE "PortalAccess" ADD CONSTRAINT "PortalAccess_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccess" ADD CONSTRAINT "PortalAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

