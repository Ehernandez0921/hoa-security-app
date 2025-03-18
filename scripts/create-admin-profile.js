// This script creates a SYSTEM_ADMIN profile directly in the database
// Usage: node scripts/create-admin-profile.js <EMAIL>

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Check for required parameters
if (process.argv.length < 3) {
  console.error('Usage: node scripts/create-admin-profile.js <EMAIL>');
  process.exit(1);
}

const userEmail = process.argv[2];
const userPassword = process.argv[3] || 'Admin123!'; // Default password if not provided

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

async function createAdminProfile(email, password) {
  try {
    console.log(`Creating admin user with email: ${email}`);

    // Step 1: Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    if (!authData?.user?.id) {
      console.error('No user ID returned from auth creation');
      return;
    }

    const userId = authData.user.id;
    console.log(`Created auth user with ID: ${userId}`);

    // Step 2: Insert the profile record
    const profile = {
      id: userId,
      name: email.split('@')[0],
      role: 'SYSTEM_ADMIN',
      status: 'APPROVED',
      address: 'Admin Address',
      email: email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([profile])
      .select();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('Successfully created admin profile:');
    console.log(profileData);
    
    console.log('\n===== SUCCESS =====');
    console.log(`Admin user created with email: ${email}`);
    console.log(`ID: ${userId}`);
    console.log('You can now sign in with these credentials');
    console.log('===================\n');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminProfile(userEmail, userPassword).then(() => process.exit(0)); 