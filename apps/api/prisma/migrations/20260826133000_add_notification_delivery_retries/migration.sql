-- AlterTable
ALTER TABLE "notification_deliveries" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notification_deliveries_status_nextAttemptAt_idx" ON "notification_deliveries"("status", "nextAttemptAt");
