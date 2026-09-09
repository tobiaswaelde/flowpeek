-- CreateEnum
CREATE TYPE "WorkflowKind" AS ENUM ('STANDARD', 'DEPENDABOT_INTERNAL');

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerWorkflowId" VARCHAR(2048) NOT NULL,
    "name" VARCHAR(1024) NOT NULL,
    "path" VARCHAR(2048),
    "kind" "WorkflowKind" NOT NULL DEFAULT 'STANDARD',
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- AddColumns
ALTER TABLE "workflow_runs"
ADD COLUMN "displayTitle" VARCHAR(1024),
ADD COLUMN "event" VARCHAR(255),
ADD COLUMN "headBranch" VARCHAR(1024),
ADD COLUMN "headSha" VARCHAR(255),
ADD COLUMN "changeRequestNumber" VARCHAR(255),
ADD COLUMN "scopeKey" VARCHAR(2048),
ADD COLUMN "workflowId" UUID;

-- Backfill workflow definitions. GitHub's internal Dependabot updater gives every run a dynamic name,
-- so legacy rows using that documented title format are consolidated into its stable internal workflow.
INSERT INTO "workflows" (
    "id",
    "createdAt",
    "updatedAt",
    "providerWorkflowId",
    "name",
    "path",
    "kind",
    "lastSeenAt",
    "repositoryId"
)
SELECT
    md5(
        runs."repositoryId"::text || ':' ||
        CASE
            WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
                THEN 'github:dynamic/dependabot/dependabot-updates'
            WHEN accounts."providerType" = 'GITLAB'
                THEN 'pipeline'
            ELSE 'legacy:name:' || runs."workflowName"
        END
    )::uuid,
    MIN(runs."createdAt"),
    CURRENT_TIMESTAMP,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'github:dynamic/dependabot/dependabot-updates'
        WHEN accounts."providerType" = 'GITLAB'
            THEN 'pipeline'
        ELSE 'legacy:name:' || runs."workflowName"
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'Dependabot Updates'
        WHEN accounts."providerType" = 'GITLAB'
            THEN 'Pipeline'
        ELSE runs."workflowName"
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'dynamic/dependabot/dependabot-updates'
        ELSE NULL
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'DEPENDABOT_INTERNAL'::"WorkflowKind"
        ELSE 'STANDARD'::"WorkflowKind"
    END,
    MAX(runs."providerCreatedAt"),
    runs."repositoryId"
FROM "workflow_runs" AS runs
JOIN "repositories" AS repositories ON repositories."id" = runs."repositoryId"
JOIN "provider_accounts" AS accounts ON accounts."id" = repositories."providerAccountId"
GROUP BY
    runs."repositoryId",
    accounts."providerType",
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'github:dynamic/dependabot/dependabot-updates'
        WHEN accounts."providerType" = 'GITLAB'
            THEN 'pipeline'
        ELSE 'legacy:name:' || runs."workflowName"
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'Dependabot Updates'
        WHEN accounts."providerType" = 'GITLAB'
            THEN 'Pipeline'
        ELSE runs."workflowName"
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'dynamic/dependabot/dependabot-updates'
        ELSE NULL
    END,
    CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'DEPENDABOT_INTERNAL'::"WorkflowKind"
        ELSE 'STANDARD'::"WorkflowKind"
    END;

-- Backfill run snapshots and link every existing run to its workflow definition.
UPDATE "workflow_runs" AS runs
SET
    "displayTitle" = runs."workflowName",
    "workflowName" = workflows."name",
    "event" = CASE WHEN workflows."kind" = 'DEPENDABOT_INTERNAL' THEN 'dynamic' ELSE NULL END,
    "scopeKey" = CASE
        WHEN accounts."providerType" = 'GITLAB' THEN 'branch:' || runs."workflowName"
        ELSE 'repository'
    END,
    "workflowId" = workflows."id"
FROM "repositories" AS repositories
JOIN "provider_accounts" AS accounts ON accounts."id" = repositories."providerAccountId"
JOIN "workflows" AS workflows ON workflows."repositoryId" = repositories."id"
WHERE
    runs."repositoryId" = repositories."id"
    AND workflows."providerWorkflowId" = CASE
        WHEN accounts."providerType" = 'GITHUB' AND runs."workflowName" LIKE '% - Update #%'
            THEN 'github:dynamic/dependabot/dependabot-updates'
        WHEN accounts."providerType" = 'GITLAB'
            THEN 'pipeline'
        ELSE 'legacy:name:' || runs."workflowName"
    END;

-- MakeRequired
ALTER TABLE "workflow_runs"
ALTER COLUMN "displayTitle" SET NOT NULL,
ALTER COLUMN "scopeKey" SET NOT NULL,
ALTER COLUMN "workflowId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workflows_repositoryId_providerWorkflowId_key"
ON "workflows"("repositoryId", "providerWorkflowId");

-- CreateIndex
CREATE INDEX "workflows_repositoryId_kind_idx" ON "workflows"("repositoryId", "kind");

-- CreateIndex
CREATE INDEX "workflows_lastSeenAt_idx" ON "workflows"("lastSeenAt");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_scopeKey_providerCreatedAt_idx"
ON "workflow_runs"("workflowId", "scopeKey", "providerCreatedAt");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
