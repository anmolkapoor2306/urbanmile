DO $$ BEGIN
  CREATE TYPE "BookingPricingSource" AS ENUM ('PRICING_ENGINE', 'TRIP_OVERRIDE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "pricingSource" "BookingPricingSource" DEFAULT 'PRICING_ENGINE';

ALTER TABLE "TripOverride"
ADD COLUMN IF NOT EXISTS "suvPrice" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "premiumPrice" DECIMAL(10,2);

UPDATE "TripOverride"
SET "suvPrice" = CASE
  WHEN "suvPrice" IS NOT NULL THEN "suvPrice"
  WHEN "milesXlMarkupType" = 'flat' THEN "sedanPrice" + "milesXlMarkup"
  WHEN "milesXlMarkupType" = 'percentage' THEN ROUND(("sedanPrice" * (1 + ("milesXlMarkup" / 100)))::numeric, 2)
  ELSE NULL
END
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'TripOverride'
    AND column_name = 'milesXlMarkup'
);

DROP INDEX IF EXISTS "TripOverride_normalizedFromCity_idx";
DROP INDEX IF EXISTS "TripOverride_normalizedToCity_idx";

ALTER TABLE "TripOverride"
DROP COLUMN IF EXISTS "normalizedFromCity",
DROP COLUMN IF EXISTS "normalizedToCity",
DROP COLUMN IF EXISTS "milesXlMarkup",
DROP COLUMN IF EXISTS "milesXlMarkupType";

CREATE INDEX IF NOT EXISTS "TripOverride_fromCity_idx" ON "TripOverride" ("fromCity");
CREATE INDEX IF NOT EXISTS "TripOverride_toCity_idx" ON "TripOverride" ("toCity");
