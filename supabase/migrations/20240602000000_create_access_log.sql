-- Create access_log table for visitor check-in tracking
CREATE TABLE IF NOT EXISTS access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES allowed_visitors(id),
  address_id UUID REFERENCES member_addresses(id),
  guard_id UUID REFERENCES profiles(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_point TEXT,
  vehicle_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for access_log table
ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

-- Security guards can insert records into access_log
CREATE POLICY "Security guards can insert access logs"
ON access_log FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'SECURITY_GUARD'
  )
);

-- Security guards can view recent access logs (last 24 hours)
CREATE POLICY "Security guards can view recent access logs"
ON access_log FOR SELECT TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'SECURITY_GUARD'
  ) AND
  check_in_time > (NOW() - INTERVAL '24 hours')
);

-- Admins have full access to access logs
CREATE POLICY "Admins have full access to access logs"
ON access_log FOR ALL TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'SYSTEM_ADMIN'
  )
);

-- Add index for performance on common queries
CREATE INDEX idx_access_log_check_in_time ON access_log (check_in_time);
CREATE INDEX idx_access_log_visitor_id ON access_log (visitor_id);
CREATE INDEX idx_access_log_guard_id ON access_log (guard_id);
CREATE INDEX idx_access_log_address_id ON access_log (address_id);

-- Create view for comprehensive access log reports
CREATE OR REPLACE VIEW access_log_report AS
SELECT 
  al.id,
  al.check_in_time,
  al.entry_point,
  al.vehicle_info,
  al.notes,
  av.first_name AS visitor_first_name,
  av.last_name AS visitor_last_name,
  av.access_code,
  ma.address,
  ma.apartment_number,
  ma.owner_name,
  ma.verification_status,
  p_guard.name AS guard_name,
  p_member.name AS member_name
FROM access_log al
LEFT JOIN allowed_visitors av ON al.visitor_id = av.id
LEFT JOIN member_addresses ma ON al.address_id = ma.id
LEFT JOIN profiles p_guard ON al.guard_id = p_guard.id
LEFT JOIN profiles p_member ON ma.member_id = p_member.id; 