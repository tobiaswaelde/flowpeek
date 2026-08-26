-- CreateEnum
CREATE TYPE "RepositoryRole" AS ENUM ('VIEWER', 'MANAGER');

-- CreateTable
CREATE TABLE "repository_memberships" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "RepositoryRole" NOT NULL DEFAULT 'VIEWER',
    "userId" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "repository_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_memberships_userId_repositoryId_key" ON "repository_memberships"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "repository_memberships_repositoryId_idx" ON "repository_memberships"("repositoryId");

-- AddForeignKey
ALTER TABLE "repository_memberships" ADD CONSTRAINT "repository_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_memberships" ADD CONSTRAINT "repository_memberships_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
