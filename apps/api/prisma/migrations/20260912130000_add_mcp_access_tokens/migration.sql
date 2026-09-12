CREATE TABLE "mcp_access_tokens" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "tokenPrefix" VARCHAR(24) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "userId" UUID NOT NULL,

    CONSTRAINT "mcp_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_access_tokens_tokenHash_key" ON "mcp_access_tokens"("tokenHash");
CREATE INDEX "mcp_access_tokens_userId_createdAt_idx" ON "mcp_access_tokens"("userId", "createdAt");

ALTER TABLE "mcp_access_tokens"
ADD CONSTRAINT "mcp_access_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
