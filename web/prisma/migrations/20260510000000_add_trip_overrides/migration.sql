CREATE TABLE "TripOverride" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fromCity" TEXT NOT NULL,
  "toCity" TEXT NOT NULL,
  "normalizedFromCity" TEXT NOT NULL,
  "normalizedToCity" TEXT NOT NULL,
  "sedanPrice" DECIMAL(10,2) NOT NULL,
  "milesXlMarkup" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "milesXlMarkupType" TEXT NOT NULL DEFAULT 'percentage',
  "reverseRoute" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TripOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripOverride_milesXlMarkupType_check" CHECK ("milesXlMarkupType" IN ('percentage', 'flat'))
);

CREATE INDEX "TripOverride_normalizedFromCity_idx" ON "TripOverride" ("normalizedFromCity");
CREATE INDEX "TripOverride_normalizedToCity_idx" ON "TripOverride" ("normalizedToCity");
CREATE INDEX "TripOverride_active_idx" ON "TripOverride" ("active");
