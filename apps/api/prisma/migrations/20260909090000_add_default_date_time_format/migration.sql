-- CreateEnum
CREATE TYPE "DefaultDateTimeFormat" AS ENUM ('LOCALE_SHORT', 'LOCALE_MEDIUM', 'ISO');

-- AlterTable
ALTER TABLE "application_settings"
ADD COLUMN "dateTimeFormat" "DefaultDateTimeFormat" NOT NULL DEFAULT 'LOCALE_MEDIUM';
