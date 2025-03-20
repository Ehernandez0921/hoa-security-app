-- Make address field optional in profiles table
ALTER TABLE profiles ALTER COLUMN address DROP NOT NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN profiles.address IS 'Optional field for backward compatibility. Use member_addresses table for address management.'; 