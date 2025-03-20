-- This migration adds the is_active column to member_addresses table if it doesn't already exist
-- It is designed to be idempotent (safe to run multiple times)

-- First, check if the column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'member_addresses' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE member_addresses ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to member_addresses table';
    ELSE
        RAISE NOTICE 'is_active column already exists in member_addresses table, skipping addition';
    END IF;
END $$;

-- Update existing records to set is_active to true only where it's NULL
-- This is safe to run even if all records already have values
UPDATE member_addresses SET is_active = TRUE WHERE is_active IS NULL;

-- Add comment to column if it doesn't have one
COMMENT ON COLUMN member_addresses.is_active IS 'Indicates if the address is active or soft-deleted';

-- Log completion of migration
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Added is_active column to member_addresses';
END $$; 