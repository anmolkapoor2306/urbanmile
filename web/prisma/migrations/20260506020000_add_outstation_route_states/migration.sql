ALTER TABLE "OutstationRoute"
  ADD COLUMN IF NOT EXISTS "originState" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationState" TEXT;
