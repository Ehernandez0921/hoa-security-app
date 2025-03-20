-- Add is_active column to member_addresses table
ALTER TABLE member_addresses ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing records to set is_active to true
UPDATE member_addresses SET is_active = TRUE WHERE is_active IS NULL;

-- Add comment to column
COMMENT ON COLUMN member_addresses.is_active IS 'Indicates if the address is active or soft-deleted'; 