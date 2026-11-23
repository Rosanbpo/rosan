-- AlterTable
ALTER TABLE "MarketingIdea" ADD COLUMN     "publishTime" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "scheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "swapReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "swapRequested" BOOLEAN NOT NULL DEFAULT false;

