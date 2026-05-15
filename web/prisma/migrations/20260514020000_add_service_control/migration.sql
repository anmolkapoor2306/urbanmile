CREATE TABLE IF NOT EXISTS "ServiceControlConfig" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "singleton_key" TEXT NOT NULL DEFAULT 'default',
  "allow_india_wide_booking" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceControlConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceControlConfig_singleton_key_key" ON "ServiceControlConfig"("singleton_key");

INSERT INTO "ServiceControlConfig" ("singleton_key", "allow_india_wide_booking")
VALUES ('default', false)
ON CONFLICT ("singleton_key") DO NOTHING;

CREATE TABLE IF NOT EXISTS "ServiceArea" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city" TEXT NOT NULL,
  "center_lat" DOUBLE PRECISION,
  "center_lng" DOUBLE PRECISION,
  "status" "OperationalZoneStatus" NOT NULL DEFAULT 'ENABLED',
  "service_radius_km" INTEGER NOT NULL DEFAULT 50,
  "airport_enabled" BOOLEAN NOT NULL DEFAULT true,
  "outstation_enabled" BOOLEAN NOT NULL DEFAULT true,
  "auto_dispatch_enabled" BOOLEAN NOT NULL DEFAULT true,
  "enabled_vehicle_types" "OperationalVehicleType"[] NOT NULL DEFAULT ARRAY['SEDAN']::"OperationalVehicleType"[],
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceArea_city_idx" ON "ServiceArea"("city");
CREATE INDEX IF NOT EXISTS "ServiceArea_status_idx" ON "ServiceArea"("status");

INSERT INTO "ServiceArea" (
  "id",
  "city",
  "center_lat",
  "center_lng",
  "status",
  "service_radius_km",
  "airport_enabled",
  "outstation_enabled",
  "auto_dispatch_enabled",
  "enabled_vehicle_types",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  "city",
  CASE lower("city")
    WHEN 'jalandhar' THEN 31.326
    WHEN 'amritsar' THEN 31.634
    WHEN 'ludhiana' THEN 30.901
    WHEN 'chandigarh' THEN 30.7333
    WHEN 'delhi' THEN 28.6139
    WHEN 'pathankot' THEN 32.2733
    ELSE NULL
  END,
  CASE lower("city")
    WHEN 'jalandhar' THEN 75.5762
    WHEN 'amritsar' THEN 74.8723
    WHEN 'ludhiana' THEN 75.8573
    WHEN 'chandigarh' THEN 76.7794
    WHEN 'delhi' THEN 77.209
    WHEN 'pathankot' THEN 75.6522
    ELSE NULL
  END,
  "status",
  COALESCE("service_radius_km", 50),
  "airport_enabled",
  "outstation_enabled",
  "auto_dispatch_enabled",
  "enabled_vehicle_types",
  "created_at",
  "updated_at"
FROM "OperationalZone"
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = current_schema()
    AND table_name = 'OperationalZone'
)
ON CONFLICT ("id") DO NOTHING;
