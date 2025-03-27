-- Drop the existing delete policy if it exists
DROP POLICY IF EXISTS "Members can delete their addresses" ON member_addresses;

-- Create a new policy that allows members to delete their addresses regardless of status
CREATE POLICY "Members can delete their addresses"
  ON member_addresses
  FOR DELETE
  USING (member_id = auth.uid());

-- Add a comment explaining the policy
COMMENT ON POLICY "Members can delete their addresses" ON member_addresses
  IS 'Allows members to delete their own addresses regardless of status (PENDING, APPROVED, or REJECTED)';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated member_addresses delete policy to allow deletion regardless of status';
END $$; 