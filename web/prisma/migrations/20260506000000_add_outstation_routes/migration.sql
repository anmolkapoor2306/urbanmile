CREATE TABLE "OutstationRoute" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "originCity" TEXT NOT NULL,
  "destinationCity" TEXT NOT NULL,
  "originAliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "destinationAliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sedanFare" DECIMAL(10,2) NOT NULL,
  "suvMarkup" DECIMAL(10,2) NOT NULL DEFAULT 1000,
  "estimatedKm" DECIMAL(8,2),
  "suggestedFare" DECIMAL(10,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutstationRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutstationRoute_originCity_destinationCity_key"
  ON "OutstationRoute" ("originCity", "destinationCity");

CREATE INDEX "OutstationRoute_originCity_idx" ON "OutstationRoute" ("originCity");
CREATE INDEX "OutstationRoute_destinationCity_idx" ON "OutstationRoute" ("destinationCity");
CREATE INDEX "OutstationRoute_isActive_idx" ON "OutstationRoute" ("isActive");
