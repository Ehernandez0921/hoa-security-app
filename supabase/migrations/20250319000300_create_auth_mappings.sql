-- Create auth_mappings table to map external provider IDs to Supabase UUIDs
CREATE TABLE IF NOT EXISTS auth_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  supabase_id UUID NOT NULL,
  provider TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_mappings_provider_id ON auth_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_auth_mappings_supabase_id ON auth_mappings(supabase_id);
CREATE INDEX IF NOT EXISTS idx_auth_mappings_email ON auth_mappings(email);

-- Create a unique constraint to prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_mappings_provider_provider_id 
  ON auth_mappings(provider, provider_id);

-- Enable RLS on the table
ALTER TABLE auth_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_mappings table
CREATE POLICY "Anyone can read mappings" 
  ON auth_mappings FOR SELECT 
  USING (true);

-- Allow service role to insert mappings
CREATE POLICY "Service role can insert mappings" 
  ON auth_mappings FOR INSERT 
  WITH CHECK (true);

-- Create a trigger to update the updated_at timestamp
CREATE TRIGGER set_auth_mappings_updated_at
BEFORE UPDATE ON auth_mappings
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at(); 