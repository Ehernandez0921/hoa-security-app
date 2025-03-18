-- Migration to fix infinite recursion in profiles RLS policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a security definer function that checks if a user is a system admin
-- This avoids the recursive policy issue
CREATE OR REPLACE FUNCTION public.is_system_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN user_role = 'SYSTEM_ADMIN';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create new policies using the function instead
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
  ON profiles FOR UPDATE 
  USING (public.is_system_admin(auth.uid()));

-- Add a policy that allows anyone to select their own profile
-- This is crucial for first-time setup and preventing lockouts
CREATE POLICY "Anyone can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Make sure the public schema is in the search_path for the function
ALTER FUNCTION public.is_system_admin(uuid) SET search_path = public, auth; 