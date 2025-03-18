-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MEMBER', 'SECURITY_GUARD', 'SYSTEM_ADMIN')),
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create allowed_visitors table
CREATE TABLE IF NOT EXISTS allowed_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_code TEXT NOT NULL CHECK (length(access_code) = 4),
  member_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_visitors ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'SYSTEM_ADMIN');

CREATE POLICY "Admins can update all profiles" 
  ON profiles FOR UPDATE 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'SYSTEM_ADMIN');

-- Create policies for allowed_visitors table
CREATE POLICY "Members can view their visitors" 
  ON allowed_visitors FOR SELECT 
  USING (member_id = auth.uid());

CREATE POLICY "Members can insert their visitors" 
  ON allowed_visitors FOR INSERT 
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members can update their visitors" 
  ON allowed_visitors FOR UPDATE 
  USING (member_id = auth.uid());

CREATE POLICY "Members can delete their visitors" 
  ON allowed_visitors FOR DELETE 
  USING (member_id = auth.uid());

CREATE POLICY "Guards can view all visitors" 
  ON allowed_visitors FOR SELECT 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'SECURITY_GUARD');

-- Create a function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_allowed_visitors_updated_at
BEFORE UPDATE ON allowed_visitors
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at(); 