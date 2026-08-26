-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "finalError" TEXT,
    "notificationRuleId" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery_attempts" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt" INTEGER NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "notificationDeliveryId" UUID NOT NULL,
    "notificationChannelId" UUID NOT NULL,

    CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notificationRuleId_workflowRunId_key" ON "notification_deliveries"("notificationRuleId", "workflowRunId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_createdAt_idx" ON "notification_deliveries"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_delivery_attempts_notificationDeliveryId_notificationChannelId_attempt_key" ON "notification_delivery_attempts"("notificationDeliveryId", "notificationChannelId", "attempt");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_notificationChannelId_createdAt_idx" ON "notification_delivery_attempts"("notificationChannelId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationRuleId_fkey" FOREIGN KEY ("notificationRuleId") REFERENCES "notification_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notificationDeliveryId_fkey" FOREIGN KEY ("notificationDeliveryId") REFERENCES "notification_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notificationChannelId_fkey" FOREIGN KEY ("notificationChannelId") REFERENCES "notification_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
