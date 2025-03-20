-- Migration to remove member_id field from allowed_visitors table
-- Since we now use address_id to associate visitors with addresses (which are linked to members)

-- First, ensure any RLS policies using member_id are removed
DROP POLICY IF EXISTS "Members can view their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can insert their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can update their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can delete their visitors" ON allowed_visitors;
DROP POLICY IF EXISTS "Members can inactivate their visitors" ON allowed_visitors;

-- Drop any indexes or triggers that might depend on member_id
DROP INDEX IF EXISTS idx_allowed_visitors_member_id;
DROP TRIGGER IF EXISTS check_member_visitor_limit ON allowed_visitors;

-- Drop the dependent view first
DROP VIEW IF EXISTS member_visitors_view;

-- Drop any functions that directly reference the member_id column
DROP FUNCTION IF EXISTS check_visitor_ownership(UUID, UUID);
DROP FUNCTION IF EXISTS get_visitor_by_code(TEXT);
DROP FUNCTION IF EXISTS get_member_visitor_count(UUID);

-- Drop the foreign key constraint if it still exists
ALTER TABLE allowed_visitors
  DROP CONSTRAINT IF EXISTS allowed_visitors_member_id_fkey;

-- Remove the member_id field with CASCADE to force dropping dependencies
ALTER TABLE allowed_visitors DROP COLUMN IF EXISTS member_id CASCADE;

-- Recreate the member_visitors_view
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

-- Update any functions related to visitor checking
CREATE OR REPLACE FUNCTION check_visitor_ownership(visitor_id UUID, user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM allowed_visitors v
    JOIN member_addresses a ON v.address_id = a.id
    WHERE v.id = visitor_id 
    AND a.member_id = user_id
  );
END;
$$ LANGUAGE plpgsql; 