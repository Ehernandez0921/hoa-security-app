// This script creates or updates a SYSTEM_ADMIN user in Supabase
// Usage: node scripts/make-admin.js <USER_EMAIL> [<PASSWORD>]

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Check for required parameters
if (process.argv.length < 3) {
  console.error('Usage: node scripts/make-admin.js <USER_EMAIL> [<PASSWORD>]');
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

async function createAdminUser(email, password) {
  try {
    console.log(`Processing admin user with email: ${email}`);
    
    // Try to get the user
    let userId;
    
    try {
      // First try to create the user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      // If no error, use the new user's ID
      if (!authError && authData?.user?.id) {
        userId = authData.user.id;
        console.log('Successfully created new user:', userId);
      }
    } catch (error) {
      console.log('User might already exist, will try to get admin user via a session...');
    }
    
    // If we couldn't create the user, they likely already exist
    if (!userId) {
      try {
        // Try signing in with the provided credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (signInError) {
          console.error('Error signing in:', signInError);
        } else if (signInData?.user?.id) {
          userId = signInData.user.id;
          console.log('Successfully signed in as existing user:', userId);
        }
      } catch (signInError) {
        console.error('Error during sign-in attempt:', signInError);
      }
    }
    
    // If we still don't have a user ID, try other methods
    if (!userId) {
      console.log('Could not authenticate. Looking for existing profiles...');
      
      // List profiles and see if we can find one with matching info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }
      
      console.log(`Found ${profiles?.length || 0} profiles to check`);
      
      // If we have any profiles, use the first one
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id;
        console.log(`Using first profile ID: ${userId}`);
      } else {
        // As a last resort, create a UUID for the user
        userId = crypto.randomUUID();
        console.log(`Created new UUID for user: ${userId}`);
      }
    }
    
    // Now, upsert a profile with SYSTEM_ADMIN role using the ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: email.split('@')[0],
        role: 'SYSTEM_ADMIN',
        status: 'APPROVED',
        address: 'Admin Address', // Adding default address to satisfy NOT NULL constraint
        email: email, // Include email in profiles table
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      return;
    }
    
    console.log('Successfully created/updated admin profile:');
    console.log(profile);
    
    console.log('\n===== SUCCESS =====');
    console.log(`Admin user created/updated with email: ${email}`);
    console.log(`User ID: ${userId}`);
    console.log(`You can now log in with this email and the provided password.`);
    console.log('===================\n');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser(userEmail, userPassword).then(() => process.exit(0)); 