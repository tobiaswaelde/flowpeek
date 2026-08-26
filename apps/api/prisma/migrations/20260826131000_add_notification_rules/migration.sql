-- CreateEnum
CREATE TYPE "NotificationRuleOutcome" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workflowPattern" VARCHAR(1024) NOT NULL,
    "outcome" "NotificationRuleOutcome" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rule_channels" (
    "notificationRuleId" UUID NOT NULL,
    "notificationChannelId" UUID NOT NULL,

    CONSTRAINT "notification_rule_channels_pkey" PRIMARY KEY ("notificationRuleId", "notificationChannelId")
);

-- CreateIndex
CREATE INDEX "notification_rules_repositoryId_enabled_outcome_idx" ON "notification_rules"("repositoryId", "enabled", "outcome");

-- CreateIndex
CREATE INDEX "notification_rule_channels_notificationChannelId_idx" ON "notification_rule_channels"("notificationChannelId");

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rule_channels" ADD CONSTRAINT "notification_rule_channels_notificationRuleId_fkey" FOREIGN KEY ("notificationRuleId") REFERENCES "notification_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rule_channels" ADD CONSTRAINT "notification_rule_channels_notificationChannelId_fkey" FOREIGN KEY ("notificationChannelId") REFERENCES "notification_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
