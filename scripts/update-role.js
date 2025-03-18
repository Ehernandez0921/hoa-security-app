// This script updates a user's role to SYSTEM_ADMIN directly
// Usage: node scripts/update-role.js <USER_EMAIL>

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Check for required parameters
if (process.argv.length < 3) {
  console.error('Usage: node scripts/update-role.js <USER_EMAIL>');
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

// Create Supabase client with the service role key
// This bypasses RLS policies
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserRole(email) {
  try {
    console.log(`Looking for user with email: ${email}`);

    // First, get profiles to find the matching user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Find profile by email
    const userProfile = profiles.find(profile => 
      profile.email && profile.email.toLowerCase() === email.toLowerCase()
    );

    if (!userProfile) {
      console.error(`No profile found with email: ${email}`);
      
      // Show available profiles
      console.log('Available profiles:');
      profiles.forEach(p => {
        console.log(`- ID: ${p.id}, Name: ${p.name}, Email: ${p.email}, Role: ${p.role}`);
      });
      return;
    }

    console.log(`Found profile with ID: ${userProfile.id}`);
    console.log(`Current role: ${userProfile.role}`);

    // Update the role using a direct SQL query to bypass any policies
    const updateResult = await supabase.rpc('admin_update_user_role', {
      user_id: userProfile.id,
      new_role: 'SYSTEM_ADMIN'
    });

    if (updateResult.error) {
      console.error('Error updating role via RPC:', updateResult.error);
      
      // Fall back to direct update
      console.log('Trying direct update...');
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'SYSTEM_ADMIN' })
        .eq('id', userProfile.id);
      
      if (error) {
        console.error('Error updating role:', error);
        return;
      }
      
      console.log('Update succeeded via direct update');
    } else {
      console.log('Update succeeded via RPC');
    }

    // Verify the update
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userProfile.id)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    console.log(`User role updated to: ${updatedProfile.role}`);
    console.log('\nNext steps:');
    console.log('1. Sign out of your application');
    console.log('2. Sign back in to refresh your session');
    console.log('3. Your role should now be SYSTEM_ADMIN');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// First, let's create the admin RPC function if it doesn't exist
async function createAdminFunction() {
  const functionQuery = `
    CREATE OR REPLACE FUNCTION admin_update_user_role(user_id UUID, new_role TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE profiles
      SET role = new_role
      WHERE id = user_id;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('pgql', { query: functionQuery });
    if (error) {
      console.error('Error creating admin function:', error);
    } else {
      console.log('Created admin function successfully');
    }
  } catch (err) {
    console.error('Error in function creation:', err);
  }
}

// Run the script
async function main() {
  await createAdminFunction();
  await updateUserRole(userEmail);
}

main().then(() => process.exit(0)); 