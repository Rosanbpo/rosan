-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "billingDay2" INTEGER,
ADD COLUMN     "firstInstallmentPct" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "billingDay2" INTEGER,
ADD COLUMN     "firstInstallmentPct" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "billingDay2" INTEGER,
ADD COLUMN     "firstInstallmentPct" INTEGER NOT NULL DEFAULT 50;

