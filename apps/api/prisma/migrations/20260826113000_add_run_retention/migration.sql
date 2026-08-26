-- CreateTable
CREATE TABLE "application_settings" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" VARCHAR(64) NOT NULL DEFAULT 'global',
    "workflowRunRetentionDays" INTEGER NOT NULL DEFAULT 90,

    CONSTRAINT "application_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN "workflowRunRetentionDays" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "application_settings_key_key" ON "application_settings"("key");
