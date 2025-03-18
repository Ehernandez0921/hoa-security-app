// This script directly fixes user access in the database
// Bypasses RLS and applies fixes using raw SQL
// Usage: node scripts/direct-fix.js <EMAIL>

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Check for required parameters
if (process.argv.length < 3) {
  console.error('Usage: node scripts/direct-fix.js <EMAIL>');
  process.exit(1);
}

const userEmail = process.argv[2];

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserAccess(email) {
  try {
    console.log(`Fixing access for user with email: ${email}`);

    // First get users from auth.users
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email);

    if (authError) {
      console.error('Error querying auth.users:', authError);
    } else {
      console.log('Auth users found:', authUsers?.length || 0);
      if (authUsers && authUsers.length > 0) {
        // Print user IDs
        authUsers.forEach(user => {
          console.log(`Auth user: ${user.email}, ID: ${user.id}`);
        });
      }
    }

    // Execute raw SQL to directly modify the database
    // This is a last resort approach
    const sqlQuery = `
    -- First, try to update any profiles with this email
    UPDATE profiles SET role = 'SYSTEM_ADMIN' WHERE email = '${email}';
    
    -- Then try to update any Microsoft users that might be linked to this email
    WITH microsoft_ids AS (
      SELECT id FROM auth.users WHERE email = '${email}'
    )
    UPDATE profiles SET role = 'SYSTEM_ADMIN' 
    WHERE id IN (SELECT id FROM microsoft_ids);
    
    -- Create a new mapping entry if one doesn't exist
    INSERT INTO auth_mappings (provider_id, supabase_id, provider, email)
    SELECT 
      mu.id, 
      sp.id, 
      'microsoft', 
      mu.email
    FROM 
      auth.users mu
    CROSS JOIN (
      SELECT id FROM profiles WHERE email = '${email}' LIMIT 1
    ) sp
    WHERE 
      mu.email = '${email}'
    AND NOT EXISTS (
      SELECT 1 FROM auth_mappings WHERE provider = 'microsoft' AND email = '${email}'
    )
    LIMIT 1;
    `;

    // Execute the SQL query through RPC if available
    try {
      const result = await supabase.rpc('exec_sql', { sql: sqlQuery });
      if (result.error) {
        console.error('Error executing SQL via RPC:', result.error);
      } else {
        console.log('SQL executed successfully via RPC');
      }
    } catch (rpcError) {
      console.error('RPC not available, trying another approach:', rpcError);
      
      // Alternative: Use direct API calls instead
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${email}%`);
        
      if (profilesError) {
        console.error('Error finding profiles:', profilesError);
      } else if (profiles && profiles.length > 0) {
        console.log('Found profiles:', profiles.length);
        
        // Update each profile
        for (const profile of profiles) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'SYSTEM_ADMIN' })
            .eq('id', profile.id);
            
          if (updateError) {
            console.error(`Error updating profile ${profile.id}:`, updateError);
          } else {
            console.log(`Updated profile ${profile.id} to SYSTEM_ADMIN`);
          }
        }
      } else {
        console.log('No profiles found with email:', email);
      }
    }

    console.log('Done! After logging out and back in, you should have admin access.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixUserAccess(userEmail).then(() => process.exit(0)); 