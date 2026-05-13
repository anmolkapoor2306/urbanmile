DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
  END IF;
END $$;
