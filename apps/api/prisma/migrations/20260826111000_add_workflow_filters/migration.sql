-- CreateEnum
CREATE TYPE "WorkflowFilterMode" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "workflow_filters" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pattern" VARCHAR(1024) NOT NULL,
    "mode" "WorkflowFilterMode" NOT NULL,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "workflow_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_filters_repositoryId_mode_pattern_key" ON "workflow_filters"("repositoryId", "mode", "pattern");

-- CreateIndex
CREATE INDEX "workflow_filters_repositoryId_mode_idx" ON "workflow_filters"("repositoryId", "mode");

-- AddForeignKey
ALTER TABLE "workflow_filters" ADD CONSTRAINT "workflow_filters_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
