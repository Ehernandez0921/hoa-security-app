-- This migration removes the address field from the profiles table
-- It is designed to be idempotent (safe to run multiple times)

-- First, check if the address column exists and drop it if it does
DO $$
BEGIN
  -- Check if address column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'address'
  ) THEN
    -- Drop the column entirely
    ALTER TABLE profiles DROP COLUMN address;
    RAISE NOTICE 'Removed address column from profiles table';
  ELSE
    RAISE NOTICE 'Address column does not exist in profiles table, nothing to do';
  END IF;
END $$;

-- Log completion of migration
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Removed address column from profiles table';
END $$; 