-- CreateTable
CREATE TABLE "ProcedureImage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedureImage_organizationId_idx" ON "ProcedureImage"("organizationId");

-- AddForeignKey
ALTER TABLE "ProcedureImage" ADD CONSTRAINT "ProcedureImage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
