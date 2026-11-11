-- Esteiras (jornada do cliente), etapa nos modelos e novas categorias. Somente aditivo.
CREATE TYPE "JourneyStage" AS ENUM ('COMERCIAL', 'PRE_ONBOARDING', 'ONBOARDING', 'IMPLANTACAO', 'OPERACIONAL', 'ESTRATEGICO', 'ACOMPANHAMENTO', 'ENCERRAMENTO');

ALTER TYPE "TaskCategory" ADD VALUE IF NOT EXISTS 'EMISSAO_NF';
ALTER TYPE "TaskCategory" ADD VALUE IF NOT EXISTS 'RELACIONAMENTO';
ALTER TYPE "TaskCategory" ADD VALUE IF NOT EXISTS 'ESTRATEGICO';

ALTER TABLE "RoutineTemplate" ADD COLUMN "stage" "JourneyStage";
ALTER TABLE "Task" ADD COLUMN "journeyKey" TEXT;

CREATE INDEX "Task_clientId_journeyKey_idx" ON "Task"("clientId", "journeyKey");
