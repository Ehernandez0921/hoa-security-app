-- Drop the existing foreign key constraint if it exists
ALTER TABLE IF EXISTS public.visitor_check_ins
  DROP CONSTRAINT IF EXISTS visitor_check_ins_address_id_fkey;

-- Add the foreign key constraint back with ON DELETE SET NULL
ALTER TABLE IF EXISTS public.visitor_check_ins
  ADD CONSTRAINT visitor_check_ins_address_id_fkey
  FOREIGN KEY (address_id)
  REFERENCES public.member_addresses(id)
  ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON CONSTRAINT visitor_check_ins_address_id_fkey ON public.visitor_check_ins 
  IS 'Foreign key to member_addresses table, nullable for unregistered addresses';

-- Drop the existing check constraint
ALTER TABLE IF EXISTS public.visitor_check_ins
  DROP CONSTRAINT IF EXISTS check_address_identification;

-- Add a more flexible check constraint that only requires unregistered_address for non-registered addresses
ALTER TABLE IF EXISTS public.visitor_check_ins
  ADD CONSTRAINT check_address_identification
  CHECK (
    (address_id IS NOT NULL AND is_registered_address = true) OR 
    (unregistered_address IS NOT NULL AND is_registered_address = false)
  );

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT check_address_identification ON public.visitor_check_ins 
  IS 'Ensures either address_id (for registered addresses) or unregistered_address (for non-registered addresses) is provided'; 