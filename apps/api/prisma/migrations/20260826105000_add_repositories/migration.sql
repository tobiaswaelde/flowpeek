-- CreateTable
CREATE TABLE "repositories" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerRepositoryId" VARCHAR(255) NOT NULL,
    "owner" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "providerAccountId" UUID NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repositories_providerAccountId_providerRepositoryId_key" ON "repositories"("providerAccountId", "providerRepositoryId");
CREATE INDEX "repositories_providerAccountId_enabled_idx" ON "repositories"("providerAccountId", "enabled");

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
