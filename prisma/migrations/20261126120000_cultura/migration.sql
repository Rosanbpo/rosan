-- CreateTable
CREATE TABLE "CompanyCulture" (
    "organizationId" TEXT NOT NULL,
    "mission" TEXT,
    "vision" TEXT,
    "values" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCulture_pkey" PRIMARY KEY ("organizationId")
);

