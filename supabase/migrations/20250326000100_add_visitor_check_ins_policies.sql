-- Add visitor_check_ins table for comprehensive logging of visitor access
CREATE TABLE IF NOT EXISTS public.visitor_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES public.allowed_visitors(id),
  address_id UUID REFERENCES public.member_addresses(id),
  checked_in_by UUID NOT NULL REFERENCES auth.users(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Fields for unregistered addresses
  first_name TEXT,
  last_name TEXT,
  unregistered_address TEXT,
  address_details JSONB,
  is_registered_address BOOLEAN DEFAULT true,
  address_source TEXT,
  street_number TEXT,
  street_name TEXT
);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS insert_check_ins ON public.visitor_check_ins;
DROP POLICY IF EXISTS select_own_check_ins ON public.visitor_check_ins;
DROP POLICY IF EXISTS admin_view_all_check_ins ON public.visitor_check_ins;
DROP POLICY IF EXISTS member_view_own_check_ins ON public.visitor_check_ins;

-- Add indexes for efficient querying of check-in logs
CREATE INDEX IF NOT EXISTS visitor_check_ins_visitor_id_idx ON public.visitor_check_ins(visitor_id);
CREATE INDEX IF NOT EXISTS visitor_check_ins_address_id_idx ON public.visitor_check_ins(address_id);
CREATE INDEX IF NOT EXISTS visitor_check_ins_checked_in_by_idx ON public.visitor_check_ins(checked_in_by);
CREATE INDEX IF NOT EXISTS visitor_check_ins_check_in_time_idx ON public.visitor_check_ins(check_in_time);

-- Add entry_method enum type if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_method_type') THEN
    CREATE TYPE public.entry_method_type AS ENUM ('NAME_VERIFICATION', 'ACCESS_CODE');
    
    -- Alter the table to use the enum type
    ALTER TABLE public.visitor_check_ins 
    ALTER COLUMN entry_method TYPE public.entry_method_type 
    USING entry_method::public.entry_method_type;
  END IF;
EXCEPTION
  WHEN others THEN
    -- If we can't create the enum type, we'll keep using TEXT
    NULL;
END $$; 