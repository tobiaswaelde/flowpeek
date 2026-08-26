-- CreateIndex
CREATE INDEX "workflow_runs_repositoryId_providerCreatedAt_idx" ON "workflow_runs"("repositoryId", "providerCreatedAt");

-- CreateIndex
CREATE INDEX "workflow_runs_repositoryId_status_completedAt_idx" ON "workflow_runs"("repositoryId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "workflow_runs_completedAt_idx" ON "workflow_runs"("completedAt");
