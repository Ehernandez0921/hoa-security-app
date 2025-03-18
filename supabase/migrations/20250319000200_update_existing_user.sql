-- Update any existing user with specific email to SYSTEM_ADMIN role
UPDATE auth.users SET raw_app_meta_data = jsonb_set(
  raw_app_meta_data, 
  '{role}', 
  '"SYSTEM_ADMIN"'
) 
WHERE email = 'eddyhernandez0921@live.com';

-- Find and update any profiles with this email as well
UPDATE profiles
SET role = 'SYSTEM_ADMIN'
WHERE email = 'eddyhernandez0921@live.com';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Updated user and profile for eddyhernandez0921@live.com to SYSTEM_ADMIN';
END $$; 