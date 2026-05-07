ALTER TABLE "OutstationRoute"
  ADD COLUMN IF NOT EXISTS "isBidirectional" BOOLEAN NOT NULL DEFAULT true;

UPDATE "OutstationRoute"
SET "isBidirectional" = true
WHERE "isBidirectional" IS DISTINCT FROM true;
