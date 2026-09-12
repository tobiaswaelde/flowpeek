CREATE TYPE "ChangeRequestState" AS ENUM ('UNKNOWN', 'OPEN', 'CLOSED', 'MERGED');

ALTER TABLE "workflow_runs"
ADD COLUMN "changeRequestState" "ChangeRequestState" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "changeRequestTargetBranch" VARCHAR(1024),
ADD COLUMN "changeRequestMergedAt" TIMESTAMP(3),
ADD COLUMN "changeRequestCheckedAt" TIMESTAMP(3);

CREATE INDEX "workflow_runs_repositoryId_changeRequestNumber_changeRequestCheckedAt_idx"
ON "workflow_runs"("repositoryId", "changeRequestNumber", "changeRequestCheckedAt");
