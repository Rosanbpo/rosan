-- AlterTable
ALTER TABLE "ClientNote" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tone" TEXT;

