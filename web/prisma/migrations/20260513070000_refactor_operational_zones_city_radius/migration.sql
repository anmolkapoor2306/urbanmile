ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "service_radius_km" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "airport_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "outstation_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "auto_dispatch_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "enabled_vehicle_types" "OperationalVehicleType"[] NOT NULL DEFAULT ARRAY['SEDAN']::"OperationalVehicleType"[];
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OperationalZone" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'maxRadiusKm'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "service_radius_km" = "maxRadiusKm" WHERE "maxRadiusKm" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'airportEnabled'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "airport_enabled" = "airportEnabled"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'outstationEnabled'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "outstation_enabled" = "outstationEnabled"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'autoDispatchEnabled'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "auto_dispatch_enabled" = "autoDispatchEnabled"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'enabledVehicleTypes'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "enabled_vehicle_types" = "enabledVehicleTypes"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'createdAt'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "created_at" = "createdAt"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'OperationalZone'
      AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'UPDATE "OperationalZone" SET "updated_at" = "updatedAt"';
  END IF;
END $$;

DROP INDEX IF EXISTS "OperationalZone_city_district_key";
DROP INDEX IF EXISTS "OperationalZone_district_idx";

ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "district";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "maxRadiusKm";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "airportEnabled";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "outstationEnabled";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "autoDispatchEnabled";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "enabledVehicleTypes";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "OperationalZone" DROP COLUMN IF EXISTS "updatedAt";

CREATE INDEX IF NOT EXISTS "OperationalZone_city_idx" ON "OperationalZone"("city");
CREATE INDEX IF NOT EXISTS "OperationalZone_status_idx" ON "OperationalZone"("status");
