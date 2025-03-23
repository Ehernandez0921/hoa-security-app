-- Add fields for unregistered address handling
ALTER TABLE visitor_check_ins
  -- Make address_id optional since we might have unregistered addresses
  ALTER COLUMN address_id DROP NOT NULL,
  -- Add fields for unregistered addresses
  ADD COLUMN unregistered_address TEXT,
  ADD COLUMN address_details JSONB,
  ADD COLUMN is_registered_address BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN address_source TEXT CHECK (address_source IN ('member', 'openstreetmap')),
  ADD COLUMN original_suggestion JSONB,
  ADD COLUMN street_number TEXT,
  ADD COLUMN street_name TEXT,
  ADD COLUMN modified_address BOOLEAN DEFAULT false;

-- Add constraint to ensure either address_id or unregistered_address details are provided
ALTER TABLE visitor_check_ins
  ADD CONSTRAINT check_address_identification
  CHECK (
    (address_id IS NOT NULL) OR 
    (unregistered_address IS NOT NULL AND street_number IS NOT NULL AND street_name IS NOT NULL)
  );

-- Update the access log report view to include unregistered address information
DROP VIEW IF EXISTS access_log_report;
CREATE VIEW access_log_report AS
SELECT 
  vc.id,
  vc.check_in_time,
  vc.entry_method,
  vc.notes,
  COALESCE(av.first_name, vc.first_name) as visitor_first_name,
  COALESCE(av.last_name, vc.last_name) as visitor_last_name,
  av.access_code,
  COALESCE(ma.address, vc.unregistered_address) as address,
  ma.apartment_number,
  ma.owner_name,
  ma.verification_status,
  p_guard.name AS guard_name,
  p_member.name AS member_name,
  vc.is_registered_address,
  vc.street_number,
  vc.street_name,
  vc.address_source,
  vc.modified_address,
  vc.address_details
FROM visitor_check_ins vc
LEFT JOIN allowed_visitors av ON vc.visitor_id = av.id
LEFT JOIN member_addresses ma ON vc.address_id = ma.id
LEFT JOIN profiles p_guard ON vc.checked_in_by = p_guard.id
LEFT JOIN profiles p_member ON ma.member_id = p_member.id;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_visitor_check_ins_is_registered ON visitor_check_ins(is_registered_address);
CREATE INDEX IF NOT EXISTS idx_visitor_check_ins_street_name ON visitor_check_ins(street_name);
CREATE INDEX IF NOT EXISTS idx_visitor_check_ins_unregistered_address ON visitor_check_ins(unregistered_address);

-- Add comment explaining the changes
COMMENT ON TABLE visitor_check_ins IS 'Stores all visitor check-ins, including those for unregistered addresses. Uses OpenStreetMap for address validation.'; 