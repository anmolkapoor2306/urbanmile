CREATE TABLE IF NOT EXISTS "PricingConfig" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "singleton_key" TEXT NOT NULL DEFAULT 'default',
  "fuel_price_per_liter" DECIMAL(10,2) NOT NULL DEFAULT 100,
  "maintenance_cost_per_km" DECIMAL(10,2) NOT NULL DEFAULT 4,
  "platform_charges" DECIMAL(10,2) NOT NULL DEFAULT 50,
  "profit_margin_percent" DECIMAL(8,2) NOT NULL DEFAULT 18,
  "driver_monthly_salary" DECIMAL(12,2) NOT NULL DEFAULT 28000,
  "car_monthly_emi" DECIMAL(12,2) NOT NULL DEFAULT 22000,
  "annual_permit_cost" DECIMAL(12,2) NOT NULL DEFAULT 25000,
  "annual_insurance_cost" DECIMAL(12,2) NOT NULL DEFAULT 32000,
  "monthly_operational_km" DECIMAL(12,2) NOT NULL DEFAULT 6000,
  "annual_operational_km" DECIMAL(12,2) NOT NULL DEFAULT 72000,
  "default_one_way_toll_cost" DECIMAL(10,2) NOT NULL DEFAULT 250,
  "default_round_trip_toll_cost" DECIMAL(10,2),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingConfig_singleton_key_key" ON "PricingConfig"("singleton_key");

CREATE TABLE IF NOT EXISTS "VehicleFuelEconomy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vehicle_type" TEXT NOT NULL,
  "km_per_liter" DECIMAL(8,2) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleFuelEconomy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleFuelEconomy_vehicle_type_key" ON "VehicleFuelEconomy"("vehicle_type");

INSERT INTO "PricingConfig" ("singleton_key")
VALUES ('default')
ON CONFLICT ("singleton_key") DO NOTHING;

INSERT INTO "VehicleFuelEconomy" ("vehicle_type", "km_per_liter")
VALUES
  ('SEDAN', 16),
  ('SUV', 12),
  ('PREMIUM', 10)
ON CONFLICT ("vehicle_type") DO NOTHING;
