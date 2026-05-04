CREATE SEQUENCE IF NOT EXISTS customer_public_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS booking_public_id_seq START 1;

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_publicId_key" ON "Customer"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_publicId_idx" ON "Customer"("publicId");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "publicBookingId" TEXT,
ADD COLUMN IF NOT EXISTS "roundTripGroupId" TEXT,
ADD COLUMN IF NOT EXISTS "parentPublicBookingId" TEXT,
ADD COLUMN IF NOT EXISTS "customerId" UUID;

WITH numbered_bookings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS row_num
  FROM "Booking"
  WHERE "publicBookingId" IS NULL
)
UPDATE "Booking" AS b
SET "publicBookingId" =
  'UM-' ||
  EXTRACT(YEAR FROM COALESCE(b."createdAt", CURRENT_TIMESTAMP))::INT::TEXT ||
  '-' ||
  LPAD(numbered_bookings.row_num::TEXT, 4, '0')
FROM numbered_bookings
WHERE b."id" = numbered_bookings."id";

WITH public_booking_sequence AS (
  SELECT COALESCE(
    (
      SELECT MAX(SUBSTRING("publicBookingId" FROM 'UM-[0-9]{4}-([0-9]+)')::BIGINT)
      FROM "Booking"
      WHERE "publicBookingId" IS NOT NULL
    ),
    0
  ) AS max_value
)
SELECT setval(
  'booking_public_id_seq',
  GREATEST(max_value, 1),
  max_value > 0
)
FROM public_booking_sequence;

ALTER TABLE "Booking"
ALTER COLUMN "publicBookingId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_publicBookingId_key" ON "Booking"("publicBookingId");
CREATE INDEX IF NOT EXISTS "Booking_publicBookingId_idx" ON "Booking"("publicBookingId");
CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX IF NOT EXISTS "Booking_roundTripGroupId_idx" ON "Booking"("roundTripGroupId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Booking_customerId_fkey'
  ) THEN
    ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
