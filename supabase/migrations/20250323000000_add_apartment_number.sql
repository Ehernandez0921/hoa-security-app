-- Migration to add apartment_number field to member_addresses table

-- Add apartment_number column to member_addresses table
ALTER TABLE member_addresses
  ADD COLUMN apartment_number TEXT;

-- Update member_visitors_view to include apartment_number
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
  a.address,
  a.apartment_number
FROM 
  allowed_visitors v
JOIN 
  member_addresses a ON v.address_id = a.id; 