DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerGender') THEN
    CREATE TYPE "CustomerGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerAuthProvider') THEN
    CREATE TYPE "CustomerAuthProvider" AS ENUM ('GOOGLE', 'PHONE_GUEST');
  END IF;
END $$;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dob" DATE,
  ADD COLUMN IF NOT EXISTS "gender" "CustomerGender",
  ADD COLUMN IF NOT EXISTS "authProvider" "CustomerAuthProvider",
  ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_supabaseUserId_key" ON "Customer"("supabaseUserId");
CREATE INDEX IF NOT EXISTS "Customer_supabaseUserId_idx" ON "Customer"("supabaseUserId");

CREATE TABLE IF NOT EXISTS "CustomerOtpVerification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "token" TEXT,
  "ipAddress" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP(6),
  "expiresAt" TIMESTAMP(6) NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerOtpVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerOtpVerification_token_key" ON "CustomerOtpVerification"("token");
CREATE INDEX IF NOT EXISTS "CustomerOtpVerification_phone_idx" ON "CustomerOtpVerification"("phone");
CREATE INDEX IF NOT EXISTS "CustomerOtpVerification_ipAddress_idx" ON "CustomerOtpVerification"("ipAddress");
CREATE INDEX IF NOT EXISTS "CustomerOtpVerification_createdAt_idx" ON "CustomerOtpVerification"("createdAt");
CREATE INDEX IF NOT EXISTS "CustomerOtpVerification_expiresAt_idx" ON "CustomerOtpVerification"("expiresAt");

CREATE TABLE IF NOT EXISTS "RateLimitEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "action" TEXT NOT NULL,
  "phone" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RateLimitEvent_action_phone_createdAt_idx" ON "RateLimitEvent"("action", "phone", "createdAt");
CREATE INDEX IF NOT EXISTS "RateLimitEvent_action_ipAddress_createdAt_idx" ON "RateLimitEvent"("action", "ipAddress", "createdAt");
