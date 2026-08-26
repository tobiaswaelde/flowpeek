-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('GITHUB', 'GITLAB', 'FORGEJO');

-- CreateTable
CREATE TABLE "provider_accounts" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "baseUrl" VARCHAR(2048),
    "encryptedAccessToken" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,

    CONSTRAINT "provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_accounts_providerType_displayName_key" ON "provider_accounts"("providerType", "displayName");
