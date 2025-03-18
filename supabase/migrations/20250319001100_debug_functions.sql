-- Create function to check if a value is a valid UUID
CREATE OR REPLACE FUNCTION is_valid_uuid(p_uuid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to get a user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- First check if the user_id is a valid UUID
  IF NOT is_valid_uuid(user_id) THEN
    RETURN 'INVALID_UUID';
  END IF;
  
  -- Try to find the role
  SELECT role INTO v_role FROM profiles WHERE id = user_id::UUID;
  
  -- Return the role or default value
  RETURN COALESCE(v_role, 'NO_ROLE_FOUND');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Function to list all profiles with emails
CREATE OR REPLACE FUNCTION list_profiles()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.name, p.email, p.role FROM profiles p;
END;
$$; 