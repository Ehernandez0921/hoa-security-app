-- Add visitor_check_ins table for comprehensive logging of visitor access
CREATE TABLE IF NOT EXISTS public.visitor_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID NOT NULL REFERENCES public.allowed_visitors(id),
  address_id UUID NOT NULL REFERENCES public.member_addresses(id),
  checked_in_by UUID NOT NULL REFERENCES auth.users(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying of check-in logs
CREATE INDEX IF NOT EXISTS visitor_check_ins_visitor_id_idx ON public.visitor_check_ins(visitor_id);
CREATE INDEX IF NOT EXISTS visitor_check_ins_address_id_idx ON public.visitor_check_ins(address_id);
CREATE INDEX IF NOT EXISTS visitor_check_ins_checked_in_by_idx ON public.visitor_check_ins(checked_in_by);
CREATE INDEX IF NOT EXISTS visitor_check_ins_check_in_time_idx ON public.visitor_check_ins(check_in_time);

-- Add RLS policies for visitor_check_ins table
ALTER TABLE public.visitor_check_ins ENABLE ROW LEVEL SECURITY;

-- Security guards can insert check-ins
CREATE POLICY insert_check_ins ON public.visitor_check_ins
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('SECURITY_GUARD', 'SYSTEM_ADMIN')
    )
  );

-- Security guards can only view check-ins they performed
CREATE POLICY select_own_check_ins ON public.visitor_check_ins
  FOR SELECT TO authenticated
  USING (
    checked_in_by = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'SYSTEM_ADMIN'
    )
  );

-- System admins can view all check-ins
CREATE POLICY admin_view_all_check_ins ON public.visitor_check_ins
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'SYSTEM_ADMIN'
    )
  );

-- Members can view check-ins for their own addresses
CREATE POLICY member_view_own_address_check_ins ON public.visitor_check_ins
  FOR SELECT TO authenticated
  USING (
    address_id IN (
      SELECT id FROM public.member_addresses WHERE member_id = auth.uid()
    )
  );

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