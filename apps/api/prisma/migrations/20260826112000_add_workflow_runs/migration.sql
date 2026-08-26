-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerRunId" VARCHAR(255) NOT NULL,
    "workflowName" VARCHAR(1024) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "providerCreatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "status" "WorkflowRunStatus" NOT NULL,
    "rawStatus" VARCHAR(255),
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_repositoryId_providerRunId_key" ON "workflow_runs"("repositoryId", "providerRunId");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
