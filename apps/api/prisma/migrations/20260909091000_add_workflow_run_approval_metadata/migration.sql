ALTER TABLE "workflow_runs"
ADD COLUMN "awaitingApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewUrl" VARCHAR(2048);

CREATE INDEX "workflow_runs_awaitingApproval_providerCreatedAt_idx"
ON "workflow_runs"("awaitingApproval", "providerCreatedAt");
