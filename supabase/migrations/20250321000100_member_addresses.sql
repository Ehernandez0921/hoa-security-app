-- Create a new member_addresses table
CREATE TABLE IF NOT EXISTS member_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id),
  address TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on member_addresses
ALTER TABLE member_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for member_addresses table
CREATE POLICY "Members can view their addresses" 
  ON member_addresses FOR SELECT 
  USING (member_id = auth.uid());

CREATE POLICY "Members can insert their addresses" 
  ON member_addresses FOR INSERT 
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members can update their addresses" 
  ON member_addresses FOR UPDATE 
  USING (member_id = auth.uid());

CREATE POLICY "Members can delete their addresses" 
  ON member_addresses FOR DELETE 
  USING (member_id = auth.uid());

CREATE POLICY "Admins can view all addresses" 
  ON member_addresses FOR SELECT 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'SYSTEM_ADMIN');

CREATE POLICY "Admins can update all addresses" 
  ON member_addresses FOR UPDATE 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'SYSTEM_ADMIN');

CREATE POLICY "Guards can view approved addresses" 
  ON member_addresses FOR SELECT 
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'SECURITY_GUARD' 
    AND status = 'APPROVED'
  );

-- Add trigger for updated_at
CREATE TRIGGER set_member_addresses_updated_at
BEFORE UPDATE ON member_addresses
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Modify the allowed_visitors table to reference addresses instead of members
ALTER TABLE allowed_visitors 
  ADD COLUMN address_id UUID REFERENCES member_addresses(id),
  DROP CONSTRAINT allowed_visitors_member_id_fkey;

-- Update existing RLS policies for allowed_visitors to use address_id
DROP POLICY IF EXISTS "Members can view their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can insert their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can update their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can delete their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Guards can view all visitors" ON allowed_visitors;

CREATE POLICY "Members can view their address visitors" 
  ON allowed_visitors FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM member_addresses 
      WHERE member_addresses.id = allowed_visitors.address_id 
      AND member_addresses.member_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert their address visitors" 
  ON allowed_visitors FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM member_addresses 
      WHERE member_addresses.id = allowed_visitors.address_id 
      AND member_addresses.member_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their address visitors" 
  ON allowed_visitors FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM member_addresses 
      WHERE member_addresses.id = allowed_visitors.address_id 
      AND member_addresses.member_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete their address visitors" 
  ON allowed_visitors FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM member_addresses 
      WHERE member_addresses.id = allowed_visitors.address_id 
      AND member_addresses.member_id = auth.uid()
    )
  );

CREATE POLICY "Guards can view approved address visitors" 
  ON allowed_visitors FOR SELECT 
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'SECURITY_GUARD'
    AND EXISTS (
      SELECT 1 FROM member_addresses 
      WHERE member_addresses.id = allowed_visitors.address_id 
      AND member_addresses.status = 'APPROVED'
    )
  );

-- Create a function to migrate existing data
CREATE OR REPLACE FUNCTION migrate_member_addresses() RETURNS void AS $$
DECLARE
  profile_rec RECORD;
  new_address_id UUID;
BEGIN
  -- For each profile, create a member_address record
  FOR profile_rec IN SELECT id, address FROM profiles WHERE address IS NOT NULL AND address != '' LOOP
    -- Insert the address as the primary address for the member
    INSERT INTO member_addresses (member_id, address, owner_name, status, is_primary)
    VALUES (profile_rec.id, profile_rec.address, (SELECT name FROM profiles WHERE id = profile_rec.id), 'APPROVED', true)
    RETURNING id INTO new_address_id;
    
    -- Update existing visitors to use the new address_id
    UPDATE allowed_visitors 
    SET address_id = new_address_id
    WHERE member_id = profile_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_member_addresses();

-- Drop the migration function after use
DROP FUNCTION migrate_member_addresses();

-- Create a view for backward compatibility
CREATE OR REPLACE VIEW member_visitors_view AS
SELECT 
  v.id,
  v.first_name,
  v.last_name,
  v.access_code,
  v.is_active,
  v.expires_at,
  v.last_used,
  v.created_at,
  v.updated_at,
  a.member_id,
  a.id as address_id,
  a.address
FROM 
  allowed_visitors v
JOIN 
  member_addresses a ON v.address_id = a.id;

-- Add function to maintain the address field in profiles for backward compatibility
CREATE OR REPLACE FUNCTION update_profile_primary_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new primary address or an update to is_primary=true
  IF NEW.is_primary = true THEN
    -- Set all other addresses for this member to non-primary
    UPDATE member_addresses
    SET is_primary = false
    WHERE member_id = NEW.member_id
    AND id != NEW.id;
    
    -- Update the profile's address field with this address
    UPDATE profiles
    SET address = NEW.address
    WHERE id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain primary address in profiles
CREATE TRIGGER maintain_primary_address
AFTER INSERT OR UPDATE ON member_addresses
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION update_profile_primary_address(); 