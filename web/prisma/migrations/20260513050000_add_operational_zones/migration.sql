DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationalZoneStatus') THEN
    CREATE TYPE "OperationalZoneStatus" AS ENUM ('ENABLED', 'LIMITED', 'DISABLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationalVehicleType') THEN
    CREATE TYPE "OperationalVehicleType" AS ENUM ('SEDAN', 'SUV', 'PREMIUM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OperationalZone" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "status" "OperationalZoneStatus" NOT NULL DEFAULT 'ENABLED',
  "airportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "outstationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "autoDispatchEnabled" BOOLEAN NOT NULL DEFAULT true,
  "enabledVehicleTypes" "OperationalVehicleType"[] NOT NULL DEFAULT ARRAY['SEDAN']::"OperationalVehicleType"[],
  "maxRadiusKm" INTEGER NOT NULL DEFAULT 25,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationalZone_city_district_key" ON "OperationalZone"("city", "district");
CREATE INDEX IF NOT EXISTS "OperationalZone_city_idx" ON "OperationalZone"("city");
CREATE INDEX IF NOT EXISTS "OperationalZone_district_idx" ON "OperationalZone"("district");
CREATE INDEX IF NOT EXISTS "OperationalZone_status_idx" ON "OperationalZone"("status");
