-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'GOTIFY', 'NTFY');

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "encryptedSecret" TEXT,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_repositoryId_name_key" ON "notification_channels"("repositoryId", "name");

-- CreateIndex
CREATE INDEX "notification_channels_repositoryId_enabled_idx" ON "notification_channels"("repositoryId", "enabled");

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
