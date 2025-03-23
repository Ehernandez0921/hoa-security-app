-- Make visitor_id optional and add name fields to visitor_check_ins table
ALTER TABLE visitor_check_ins
  ALTER COLUMN visitor_id DROP NOT NULL,
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Add check constraint to ensure either visitor_id or names are provided
ALTER TABLE visitor_check_ins
  ADD CONSTRAINT check_visitor_identification
  CHECK (
    (visitor_id IS NOT NULL) OR 
    (first_name IS NOT NULL AND last_name IS NOT NULL)
  );

-- Update the view for comprehensive access log reports if it exists
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
  ma.address,
  ma.apartment_number,
  ma.owner_name,
  ma.verification_status,
  p_guard.name AS guard_name,
  p_member.name AS member_name
FROM visitor_check_ins vc
LEFT JOIN allowed_visitors av ON vc.visitor_id = av.id
LEFT JOIN member_addresses ma ON vc.address_id = ma.id
LEFT JOIN profiles p_guard ON vc.checked_in_by = p_guard.id
LEFT JOIN profiles p_member ON ma.member_id = p_member.id; 