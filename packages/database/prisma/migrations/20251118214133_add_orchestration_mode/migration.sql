-- CreateEnum
CREATE TYPE "OrchestrationMode" AS ENUM ('FLOW', 'QA');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "orchestrationMode" "OrchestrationMode" NOT NULL DEFAULT 'FLOW';
