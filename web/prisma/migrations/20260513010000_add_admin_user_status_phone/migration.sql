DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminUserStatus') THEN
    CREATE TYPE "AdminUserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
  END IF;
END $$;

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

UPDATE "AdminUser"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"AdminUserStatus" ELSE 'INACTIVE'::"AdminUserStatus" END
WHERE "status" IS NULL;

CREATE INDEX IF NOT EXISTS "AdminUser_status_idx" ON "AdminUser"("status");
