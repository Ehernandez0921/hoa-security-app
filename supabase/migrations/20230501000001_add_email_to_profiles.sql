-- Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- For existing profiles, update email from auth.users if possible
UPDATE public.profiles p
SET email = a.email
FROM auth.users a
WHERE p.id = a.id
  AND p.email IS NULL; 