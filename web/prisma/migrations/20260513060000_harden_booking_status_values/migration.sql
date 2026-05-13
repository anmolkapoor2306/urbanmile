-- Safe status repair for databases that still contain old booking workflow labels.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NEEDS_ASSIGNMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'NEEDS_ASSIGNMENT';

UPDATE "Booking"
SET "status" = 'NEEDS_ASSIGNMENT'
WHERE "status"::text IN ('LEGACY_NEW', 'legacy_new', 'NEW', 'CONFIRMED');

UPDATE "Booking"
SET "status" = 'COMPLETE'
WHERE "status"::text = 'COMPLETED';
