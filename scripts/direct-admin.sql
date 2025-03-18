-- This SQL file directly updates a user to have SYSTEM_ADMIN role
-- Run this through the Supabase SQL editor to bypass RLS policies

-- Replace the ID in the first example with your actual user ID
UPDATE profiles 
SET role = 'SYSTEM_ADMIN', 
    status = 'APPROVED', 
    updated_at = NOW() 
WHERE id = '18b3f7f1-fee2-4451-bf59-904453662979';

-- Alternative: Update by matching name or email pattern (if you can't access the ID directly)
-- UPDATE profiles 
-- SET role = 'SYSTEM_ADMIN', 
--     status = 'APPROVED', 
--     updated_at = NOW() 
-- WHERE email = 'eddyhernandez0921@live.com'
-- OR name ILIKE 'eddyhernandez%';

-- List all profiles to verify the change
SELECT * FROM profiles; 