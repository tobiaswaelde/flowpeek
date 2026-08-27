-- Existing channel secrets cannot be converted in SQL because they are encrypted by the application.
-- Keep channel IDs, rules, deliveries, and attempts intact; require administrators to configure one
-- replacement Apprise URL before re-enabling each legacy channel.
ALTER TABLE "notification_channels"
  ADD COLUMN "encryptedUrl" TEXT,
  ADD COLUMN "urlScheme" VARCHAR(64),
  ADD COLUMN "requiresReconfiguration" BOOLEAN NOT NULL DEFAULT false;

UPDATE "notification_channels"
SET "enabled" = false, "requiresReconfiguration" = true;

ALTER TABLE "notification_channels"
  DROP COLUMN "configuration",
  DROP COLUMN "encryptedSecret",
  DROP COLUMN "type";

DROP TYPE "NotificationChannelType";
