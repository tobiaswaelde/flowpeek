CREATE TABLE "user_avatars" (
    "userId" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "etag" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "user_avatars"
ADD CONSTRAINT "user_avatars_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
