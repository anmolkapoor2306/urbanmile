-- Normalize booking statuses to the current public workflow names.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'NEEDS_ASSIGNMENT';

UPDATE "Booking"
SET "status" = 'NEEDS_ASSIGNMENT'
WHERE "status"::text IN ('LEGACY_NEW', 'legacy_new', 'NEW', 'CONFIRMED');

UPDATE "Booking"
SET "status" = 'COMPLETE'
WHERE "status"::text = 'COMPLETED';
