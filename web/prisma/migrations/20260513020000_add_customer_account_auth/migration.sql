DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerGender') THEN
    ALTER TYPE "CustomerGender" ADD VALUE IF NOT EXISTS 'NON_BINARY';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerAuthProvider') THEN
    ALTER TYPE "CustomerAuthProvider" ADD VALUE IF NOT EXISTS 'MANUAL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerRole') THEN
    CREATE TYPE "CustomerRole" AS ENUM ('CUSTOMER');
  END IF;
END $$;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "googleId" TEXT,
  ADD COLUMN IF NOT EXISTS "role" "CustomerRole" NOT NULL DEFAULT 'CUSTOMER';

UPDATE "Customer"
SET "fullName" = COALESCE(NULLIF("fullName", ''), "name")
WHERE "fullName" IS NULL OR "fullName" = '';

ALTER TABLE "Customer"
  ALTER COLUMN "fullName" SET NOT NULL,
  ALTER COLUMN "fullName" SET DEFAULT '',
  ALTER COLUMN "phone" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_googleId_key" ON "Customer"("googleId") WHERE "googleId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
CREATE INDEX IF NOT EXISTS "Customer_googleId_idx" ON "Customer"("googleId");

CREATE TABLE IF NOT EXISTS "CustomerSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(6) NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerSession_token_key" ON "CustomerSession"("token");
CREATE INDEX IF NOT EXISTS "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerSession_token_idx" ON "CustomerSession"("token");
CREATE INDEX IF NOT EXISTS "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CustomerSession_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerSession"
    ADD CONSTRAINT "CustomerSession_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
