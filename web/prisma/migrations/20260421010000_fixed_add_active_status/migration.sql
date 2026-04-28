-- Create new enum type with ACTIVE included
CREATE TYPE "BookingStatus_new" AS ENUM (
    'NEW',
    'CONFIRMED', 
    'ASSIGNED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);

-- Step 1: Update all booking records to temporarily use the new enum type
DROP TYPE "BookingStatus" CASCADE;

-- Prisma will handle the renaming automatically now