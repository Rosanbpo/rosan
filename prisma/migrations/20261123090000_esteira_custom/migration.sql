-- CreateTable
CREATE TABLE "EsteiraCustom" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stages" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsteiraCustom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EsteiraCustom_organizationId_slug_key" ON "EsteiraCustom"("organizationId", "slug");

