-- Create an RPC function to bypass RLS for creating profiles
CREATE OR REPLACE FUNCTION create_profile_bypass_rls(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_address TEXT,
  p_status TEXT
) RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER -- This will run with the privileges of the function owner
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
      address, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      p_id,
      p_name,
      p_email,
      p_role,
      p_address,
      p_status,
      NOW(),
      NOW()
    );
    
    -- Return inserted profile
    RETURN QUERY SELECT * FROM profiles WHERE id = p_id;
  END IF;
END;
$$;

-- Ensure we have proper RLS policies for profiles table
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Check if the policy exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Enable create for authenticated users only'
  ) INTO policy_exists;
  
  -- If policy exists, alter it; otherwise create it
  IF policy_exists THEN
    -- Alter existing policy
    EXECUTE 'ALTER POLICY "Enable create for authenticated users only" ON "public"."profiles"
      USING (auth.role() = ''authenticated'' OR auth.role() = ''service_role'')
      WITH CHECK (auth.role() = ''authenticated'' OR auth.role() = ''service_role'')';
  ELSE
    -- Create new policy
    EXECUTE 'CREATE POLICY "Enable create for authenticated users only" ON "public"."profiles"
      FOR INSERT
      TO authenticated, service_role
      WITH CHECK (true)';
  END IF;
END
$$;

-- Ensure we have a policy for select by email (needed for checking existing profiles)
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Check if the policy exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow select by email'
  ) INTO policy_exists;
  
  -- If policy exists, drop it first
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Allow select by email" ON "public"."profiles"';
  END IF;
  
  -- Create the policy
  EXECUTE 'CREATE POLICY "Allow select by email" ON "public"."profiles"
    FOR SELECT
    USING (true)';
END
$$;
  
-- Create policy for auth_mappings table - may not exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'auth_mappings') THEN
    -- Check if the policy exists
    IF EXISTS (
      SELECT 1 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'auth_mappings' 
      AND policyname = 'Enable all for authenticated users only'
    ) THEN
      EXECUTE 'DROP POLICY "Enable all for authenticated users only" ON "public"."auth_mappings"';
    END IF;
    
    -- Create the policy
    EXECUTE 'CREATE POLICY "Enable all for authenticated users only" ON "public"."auth_mappings"
      USING (true) 
      WITH CHECK (true)';
  END IF;
END
$$; 