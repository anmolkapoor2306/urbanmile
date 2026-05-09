DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingLocationSource') THEN
    ALTER TYPE "BookingLocationSource" ADD VALUE IF NOT EXISTS 'AUTOCOMPLETE';
    ALTER TYPE "BookingLocationSource" ADD VALUE IF NOT EXISTS 'MANUAL_PIN';
  END IF;
END $$;
