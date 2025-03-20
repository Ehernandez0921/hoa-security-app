const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create a Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required env variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test visitor check-in
async function testCheckIn() {
  // Variables for the test - replace with actual IDs from your database
  const visitorId = '40b0bbe9-a59a-466b-aa84-e9085f3c72f1'; // ID from the error log
  const addressId = '98bd1644-2f1a-44af-91d4-d070f652571f'; // From the error log
  const guardId = '93f0e686-25d9-4a87-9904-1c1693b1ca8e'; // From the error log
  
  try {
    // First update the visitor's last_used timestamp
    const { data: visitorData, error: visitorError } = await supabaseAdmin
      .from('allowed_visitors')
      .update({
        last_used: new Date().toISOString()
      })
      .eq('id', visitorId)
      .select('*')
      .single();
    
    if (visitorError) {
      console.error('Error updating visitor last_used timestamp:', visitorError);
      return;
    }
    
    console.log('Successfully updated visitor last_used timestamp');
    
    // Now insert a check-in record
    const { data: checkInData, error: checkInError } = await supabaseAdmin
      .from('visitor_check_ins')
      .insert({
        visitor_id: visitorId,
        address_id: addressId,
        checked_in_by: guardId,
        check_in_time: new Date().toISOString(),
        entry_method: 'NAME_VERIFICATION',
        notes: 'Test check-in after foreign key fix'
      })
      .select('*')
      .single();
    
    if (checkInError) {
      console.error('Error logging visitor check-in:', checkInError);
      return;
    }
    
    console.log('Successfully checked in visitor!');
    console.log('Check-in data:', checkInData);
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the test
testCheckIn()
  .catch(console.error)
  .finally(() => {
    console.log('Test completed');
    process.exit(0);
  }); 