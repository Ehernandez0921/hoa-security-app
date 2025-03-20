-- Add verification columns to member_addresses table
ALTER TABLE member_addresses
  ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'INVALID', 'NEEDS_REVIEW')),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Update RLS policies to allow admins to update verification fields
DROP POLICY IF EXISTS "Admins can update address verification status" ON member_addresses;
CREATE POLICY "Admins can update address verification status"
  ON member_addresses
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'SYSTEM_ADMIN')
  WITH CHECK (auth.jwt() ->> 'role' = 'SYSTEM_ADMIN');

-- Create function to check if an address is verified
DROP FUNCTION IF EXISTS is_address_verified(UUID);
CREATE OR REPLACE FUNCTION is_address_verified(address_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  verified BOOLEAN;
BEGIN
  SELECT verification_status = 'VERIFIED' INTO verified
  FROM member_addresses
  WHERE id = address_id;
  
  RETURN COALESCE(verified, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 