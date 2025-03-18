-- Update the user to have SYSTEM_ADMIN role by ID
UPDATE profiles 
SET role = 'SYSTEM_ADMIN', 
    status = 'APPROVED', 
    updated_at = NOW() 
WHERE id = '18b3f7f1-fee2-4451-bf59-904453662979';

-- Also update any profile where the name or email matches, as a fallback
UPDATE profiles 
SET role = 'SYSTEM_ADMIN', 
    status = 'APPROVED', 
    updated_at = NOW() 
WHERE (
  email = 'eddyhernandez0921@live.com'
  OR name ILIKE 'eddyhernandez%'
) 
AND role != 'SYSTEM_ADMIN'; 