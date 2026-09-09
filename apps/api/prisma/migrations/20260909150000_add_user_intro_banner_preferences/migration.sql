ALTER TABLE "users"
ADD COLUMN "dismissedIntroBannerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
