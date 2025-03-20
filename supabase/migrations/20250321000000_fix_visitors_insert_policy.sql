-- Fix RLS policy for allowed_visitors table to allow members to insert new visitors

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS member_visitors_policy ON public.allowed_visitors;

-- Create separate policies for different operations
-- Policy for SELECT operations
CREATE POLICY "allowed_visitors_select_policy"
ON public.allowed_visitors
FOR SELECT
USING (
  -- Members can only select their own visitors
  (auth.uid() = member_id)
  OR 
  -- System admins can select all visitors
  (SELECT public.is_system_admin(auth.uid()))
  OR
  -- Security guards can select all visitors for lookups
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'SECURITY_GUARD'
  )
);

-- Policy for INSERT operations
CREATE POLICY "allowed_visitors_insert_policy"
ON public.allowed_visitors
FOR INSERT
WITH CHECK (
  -- Members can only insert their own visitors
  auth.uid() = member_id
);

-- Policy for UPDATE operations
CREATE POLICY "allowed_visitors_update_policy"
ON public.allowed_visitors
FOR UPDATE
USING (
  -- Members can only update their own visitors
  auth.uid() = member_id
);

-- Policy for DELETE operations
CREATE POLICY "allowed_visitors_delete_policy"
ON public.allowed_visitors
FOR DELETE
USING (
  -- Members can only delete their own visitors
  auth.uid() = member_id
);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_visitors TO authenticated; 