-- Drop the trigger first
DROP TRIGGER IF EXISTS maintain_primary_address ON member_addresses;

-- Then drop the function
DROP FUNCTION IF EXISTS update_profile_primary_address;

-- Remove the address column from profiles table if it still exists
ALTER TABLE profiles DROP COLUMN IF EXISTS address;

-- Add a comment to explain the change
COMMENT ON TABLE member_addresses IS 'Stores member addresses. Primary addresses are managed through the is_primary column in this table.'; 