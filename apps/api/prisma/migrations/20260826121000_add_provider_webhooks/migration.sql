-- AlterTable
ALTER TABLE "provider_accounts" ADD COLUMN "encryptedWebhookSecret" TEXT;

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryId" VARCHAR(255) NOT NULL,
    "event" VARCHAR(255) NOT NULL,
    "providerRepositoryId" VARCHAR(255),
    "providerAccountId" UUID NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_providerAccountId_deliveryId_key" ON "webhook_deliveries"("providerAccountId", "deliveryId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_providerAccountId_createdAt_idx" ON "webhook_deliveries"("providerAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
