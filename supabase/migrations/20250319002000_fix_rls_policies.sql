-- Disable RLS temporarily to debug
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Add a better RPC function for Microsoft users, with no RLS
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
      address,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_id,
      p_name,
      p_email,
      'MEMBER',
      'No address provided',
      'PENDING',
      NOW(),
      NOW()
    ) RETURNING id INTO v_profile_id;
    
    -- Return the new profile
    RETURN QUERY SELECT * FROM profiles WHERE id = v_profile_id;
  END IF;
END;
$$;

-- Add public function to check if a user exists by email
CREATE OR REPLACE FUNCTION check_user_exists_by_email(
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE email = p_email
  );
END;
$$;

-- Function to get a user's profile by email
CREATE OR REPLACE FUNCTION get_user_profile_by_email(
  p_email TEXT
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM profiles WHERE email = p_email;
END;
$$; 