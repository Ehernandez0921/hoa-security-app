-- Fix the foreign key constraint in visitor_check_ins table
-- First, we need to drop the existing constraint
ALTER TABLE IF EXISTS public.visitor_check_ins
  DROP CONSTRAINT IF EXISTS visitor_check_ins_checked_in_by_fkey;

-- Then recreate it to point to the profiles table instead of auth.users
ALTER TABLE IF EXISTS public.visitor_check_ins
  ADD CONSTRAINT visitor_check_ins_checked_in_by_fkey
  FOREIGN KEY (checked_in_by)
  REFERENCES public.profiles(id);

-- Update the access_log table constraint as well for consistency
ALTER TABLE IF EXISTS public.access_log
  DROP CONSTRAINT IF EXISTS access_log_guard_id_fkey;

ALTER TABLE IF EXISTS public.access_log
  ADD CONSTRAINT access_log_guard_id_fkey
  FOREIGN KEY (guard_id)
  REFERENCES public.profiles(id);

-- Add a note about the fix
COMMENT ON TABLE public.visitor_check_ins IS 'Visitor check-ins table with foreign key to profiles (not auth.users)'; 