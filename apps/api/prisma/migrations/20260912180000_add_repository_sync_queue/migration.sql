CREATE TYPE "RepositorySyncRequestStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED');

ALTER TABLE "provider_accounts"
ADD COLUMN "syncLeaseToken" VARCHAR(64),
ADD COLUMN "syncLeaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "rateLimitResetAt" TIMESTAMP(3);

CREATE TABLE "repository_sync_requests" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "RepositorySyncRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "runAfter" TIMESTAMP(3) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "leaseToken" VARCHAR(64),
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "repository_sync_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_sync_requests_repositoryId_key"
ON "repository_sync_requests"("repositoryId");

CREATE INDEX "repository_sync_requests_status_runAfter_idx"
ON "repository_sync_requests"("status", "runAfter");

CREATE INDEX "repository_sync_requests_leaseExpiresAt_idx"
ON "repository_sync_requests"("leaseExpiresAt");

ALTER TABLE "repository_sync_requests"
ADD CONSTRAINT "repository_sync_requests_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
