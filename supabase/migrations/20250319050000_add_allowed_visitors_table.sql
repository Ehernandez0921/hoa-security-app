-- Alter existing allowed_visitors table to match the new schema requirements

-- Remove the name column constraint if it exists
ALTER TABLE public.allowed_visitors DROP CONSTRAINT IF EXISTS allowed_visitors_name_check;

-- Remove the access_code constraint if it exists
ALTER TABLE public.allowed_visitors DROP CONSTRAINT IF EXISTS allowed_visitors_access_code_check;

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.allowed_visitors ADD COLUMN first_name TEXT;
  END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.allowed_visitors ADD COLUMN last_name TEXT;
  END IF;
END $$;

-- Migrate data from name to first_name and last_name if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'name'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'first_name'
  ) THEN
    -- Update first_name with name where first_name is null
    UPDATE public.allowed_visitors 
    SET first_name = name 
    WHERE first_name IS NULL AND name IS NOT NULL;
    
    -- Drop the name column if it exists
    ALTER TABLE public.allowed_visitors DROP COLUMN IF EXISTS name;
  END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.allowed_visitors ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.allowed_visitors ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 day';
  END IF;
END $$;

-- Add last_used column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'last_used'
  ) THEN
    ALTER TABLE public.allowed_visitors ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Modify access_code to be optional and remove length constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'allowed_visitors' 
    AND column_name = 'access_code'
  ) THEN
    -- Remove NOT NULL constraint if it exists
    ALTER TABLE public.allowed_visitors ALTER COLUMN access_code DROP NOT NULL;
  END IF;
END $$;

-- Set up or update RLS (Row Level Security) for allowed_visitors table
ALTER TABLE public.allowed_visitors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Members can view their visitors" ON public.allowed_visitors;
DROP POLICY IF EXISTS "Members can insert their visitors" ON public.allowed_visitors;
DROP POLICY IF EXISTS "Members can update their visitors" ON public.allowed_visitors;
DROP POLICY IF EXISTS "Members can delete their visitors" ON public.allowed_visitors;
DROP POLICY IF EXISTS "Guards can view all visitors" ON public.allowed_visitors;
DROP POLICY IF EXISTS member_visitors_policy ON public.allowed_visitors;

-- Create a new comprehensive policy
CREATE POLICY member_visitors_policy ON public.allowed_visitors
  FOR ALL
  USING (
    -- Members can only access their own visitors
    (auth.uid() = member_id)
    OR 
    -- System admins can access all visitors
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'SYSTEM_ADMIN'
    )
    OR
    -- Security guards can access all visitors for lookups
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'SECURITY_GUARD'
    )
  ); 