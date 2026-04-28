ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "Booking_archivedAt_idx" ON "Booking"("archivedAt");
