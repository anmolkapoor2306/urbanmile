-- Replace legacy booking intake statuses with the explicit dispatch queue status.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NEEDS_ASSIGNMENT';

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'NEEDS_ASSIGNMENT';

UPDATE "Booking"
SET "status" = 'NEEDS_ASSIGNMENT'
WHERE "status" IN ('NEW', 'CONFIRMED');
