-- AlterTable
ALTER TABLE "MarketingIdea" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'CARROSSEL';

