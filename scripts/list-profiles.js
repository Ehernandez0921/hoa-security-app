// This script lists all profiles in the database
// Usage: node scripts/list-profiles.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

async function listProfiles() {
  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in the database.');
      return;
    }

    console.log(`Found ${profiles.length} profiles:`);
    console.log('=========================================');
    
    profiles.forEach((profile, index) => {
      console.log(`Profile #${index + 1}:`);
      console.log(`  ID: ${profile.id}`);
      console.log(`  Name: ${profile.name || 'N/A'}`);
      console.log(`  Email: ${profile.email || 'N/A'}`);
      console.log(`  Role: ${profile.role || 'N/A'}`);
      console.log(`  Status: ${profile.status || 'N/A'}`);
      console.log(`  Created: ${profile.created_at || 'N/A'}`);
      console.log(`  Updated: ${profile.updated_at || 'N/A'}`);
      console.log('----------------------------------------');
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
listProfiles().then(() => process.exit(0)); 