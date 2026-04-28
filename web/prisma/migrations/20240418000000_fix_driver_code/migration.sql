-- This migration backfills driver codes for existing drivers that don't have them
-- It assigns DRV-000X codes to own drivers and TDRV-000X codes to third-party drivers

-- Step 1: Create a temporary table to store the updated driver data
CREATE TEMP TABLE temp_driver_updates AS
SELECT 
    id,
    driverType,
    ROW_NUMBER() OVER (PARTITION BY driverType ORDER BY createdAt ASC) AS row_num
FROM "Driver"
WHERE "driverCode" IS NULL OR "driverCode" = '';

-- Step 2: Update drivers with generated codes
UPDATE "Driver" 
SET "driverCode" = CASE 
    WHEN d."driverType" = 'OWN' THEN 'DRV-' || LPAD(CAST(temp.row_num AS TEXT), 4, '0')
    WHEN d."driverType" = 'THIRD_PARTY' THEN 'TDRV-' || LPAD(CAST(temp.row_num AS TEXT), 4, '0')
END
FROM temp_driver_updates temp
JOIN "Driver" d ON temp.id = d.id
WHERE d."driverCode" IS NULL OR d."driverCode" = '';

-- Clean up temporary table
DROP TABLE temp_driver_updates;

-- Step 3: Add a NOT NULL constraint if it doesn't exist
ALTER TABLE "Driver" 
ALTER COLUMN "driverCode" SET NOT NULL;