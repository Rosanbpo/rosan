-- Meta de receita e capacidade da equipe. Somente aditivo.
ALTER TABLE "Organization" ADD COLUMN "revenueGoal" DECIMAL(12,2);
ALTER TABLE "Organization" ADD COLUMN "revenueGoalDate" DATE;
ALTER TABLE "Organization" ADD COLUMN "capacityHours" INTEGER;
