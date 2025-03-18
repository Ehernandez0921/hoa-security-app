import { supabase } from './supabase';

interface TableInfo {
  table_name: string;
}

export async function setupDatabase() {
  console.log('Setting up database tables...');
  
  try {
    // Instead of querying information_schema directly, let's check if we can query our tables
    // If we can successfully select from profiles, the table likely exists
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If no error, profiles table exists
    if (!profilesError) {
      console.log('Profiles table exists. Skipping setup.');
      return;
    }
    
    console.log('Setting up tables...');

    // Create tables
    const createProfilesTableQuery = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('MEMBER', 'SECURITY_GUARD', 'SYSTEM_ADMIN')),
        address TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const createVisitorsTableQuery = `
      CREATE TABLE IF NOT EXISTS allowed_visitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        access_code TEXT NOT NULL CHECK (length(access_code) = 4),
        member_id UUID NOT NULL REFERENCES profiles(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const enableRLSQuery = `
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE allowed_visitors ENABLE ROW LEVEL SECURITY;
    `;

    const createPoliciesQuery = `
      -- Profiles policies
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

      -- Allowed visitors policies
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
    `;

    // Execute queries
    await supabase.rpc('pgql', { query: createProfilesTableQuery });
    await supabase.rpc('pgql', { query: createVisitorsTableQuery });
    await supabase.rpc('pgql', { query: enableRLSQuery });
    await supabase.rpc('pgql', { query: createPoliciesQuery });

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
} 