-- Add verification columns to member_addresses table
ALTER TABLE member_addresses
  ADD COLUMN verification_status TEXT CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'INVALID', 'NEEDS_REVIEW')),
  ADD COLUMN verification_notes TEXT,
  ADD COLUMN verification_date TIMESTAMPTZ,
  ADD COLUMN verified_by UUID REFERENCES auth.users(id);

-- Update RLS policies to allow admins to update verification fields
CREATE POLICY "Admins can update address verification status"
  ON member_addresses
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'SYSTEM_ADMIN')
  WITH CHECK (auth.jwt() ->> 'role' = 'SYSTEM_ADMIN');

-- Create function to check if an address is verified
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