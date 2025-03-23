-- Temporarily alter the profiles table to remove the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Update our create_microsoft_user_profile function to work without the constraint
CREATE OR REPLACE FUNCTION create_microsoft_user_profile(
  p_id UUID,
  p_name TEXT,
  p_email TEXT
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Check if the user already exists by email
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE email = p_email
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Return the existing profile
    RETURN QUERY SELECT * FROM profiles WHERE email = p_email;
  ELSE
    -- Create a new profile
    INSERT INTO profiles (
      id,
      name,
      email,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_id,
      p_name,
      p_email,
      'SYSTEM_ADMIN',
      'APPROVED',
      NOW(),
      NOW()
    ) RETURNING id INTO v_profile_id;
    
    -- Return the new profile
    RETURN QUERY SELECT * FROM profiles WHERE id = v_profile_id;
  END IF;
END;
$$;

-- Update the other functions too
CREATE OR REPLACE FUNCTION create_profile_bypass_rls(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_status TEXT
) RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if profile with this email already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    -- Return existing profile
    RETURN QUERY SELECT * FROM profiles WHERE email = p_email;
  ELSE
    -- Insert new profile
    INSERT INTO profiles (
      id, 
      name, 
      email, 
      role, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      p_id,
      p_name,
      p_email,
      p_role,
      p_status,
      NOW(),
      NOW()
    );
    
    -- Return inserted profile
    RETURN QUERY SELECT * FROM profiles WHERE id = p_id;
  END IF;
END;
$$; 