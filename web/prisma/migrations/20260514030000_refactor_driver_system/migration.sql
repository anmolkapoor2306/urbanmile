DO $$ BEGIN
  CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DriverDutyStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BREAK', 'ON_TRIP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "DriverType" ADD VALUE IF NOT EXISTS 'OWN_DRIVER';
ALTER TYPE "DriverType" ADD VALUE IF NOT EXISTS 'VENDOR_DRIVER';
ALTER TYPE "CarType" ADD VALUE IF NOT EXISTS 'PREMIUM';

ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "dutyStatus" "DriverDutyStatus" NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN IF NOT EXISTS "currentLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "currentLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

UPDATE "Driver"
SET
  "fullName" = COALESCE(NULLIF("fullName", ''), "name"),
  "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"DriverStatus" ELSE 'INACTIVE'::"DriverStatus" END,
  "dutyStatus" = CASE
    WHEN "availabilityStatus" = 'AVAILABLE' THEN 'ONLINE'::"DriverDutyStatus"
    WHEN "availabilityStatus" = 'BUSY' THEN 'ON_TRIP'::"DriverDutyStatus"
    ELSE 'OFFLINE'::"DriverDutyStatus"
  END
WHERE "fullName" IS NULL OR "fullName" = '';

ALTER TABLE "Driver" ALTER COLUMN "fullName" SET DEFAULT '';
ALTER TABLE "Driver" ALTER COLUMN "fullName" SET NOT NULL;
ALTER TABLE "Driver" ALTER COLUMN "vehicleType" DROP NOT NULL;
ALTER TABLE "Driver" ALTER COLUMN "vehicleNumber" DROP NOT NULL;

WITH ranked_phones AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "phone" ORDER BY "createdAt" ASC, "id" ASC) AS row_number
  FROM "Driver"
  WHERE "phone" IS NOT NULL AND "phone" <> ''
)
UPDATE "Driver"
SET "phone" = "phone" || '-archived-' || SUBSTRING("id", 1, 8)
WHERE "id" IN (SELECT "id" FROM ranked_phones WHERE row_number > 1);

WITH ranked_emails AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY LOWER("email") ORDER BY "createdAt" ASC, "id" ASC) AS row_number
  FROM "Driver"
  WHERE "email" IS NOT NULL AND "email" <> ''
)
UPDATE "Driver"
SET "email" = NULL
WHERE "id" IN (SELECT "id" FROM ranked_emails WHERE row_number > 1);

CREATE INDEX IF NOT EXISTS "Driver_status_idx" ON "Driver"("status");
CREATE INDEX IF NOT EXISTS "Driver_dutyStatus_idx" ON "Driver"("dutyStatus");

CREATE UNIQUE INDEX IF NOT EXISTS "Driver_phone_key" ON "Driver"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Driver_email_key" ON "Driver"("email") WHERE "email" IS NOT NULL;
