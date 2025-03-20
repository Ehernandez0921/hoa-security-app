import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key bypasses RLS

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create a supabase client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkAddressesAsAdmin() {
  console.log('Checking all addresses in the database as admin...');
  
  const { data: allAddresses, error: allError } = await supabaseAdmin
    .from('member_addresses')
    .select('*');
  
  if (allError) {
    console.error('Error fetching all addresses:', allError);
    return;
  }
  
  console.log(`Found ${allAddresses.length} total addresses:`);
  
  // Count by status
  const statusCounts = allAddresses.reduce((acc, addr) => {
    const status = addr.status?.toUpperCase() || 'UNKNOWN';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Addresses by status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}`);
  });
  
  console.log('\nChecking PENDING addresses specifically...');
  
  const { data: pendingAddresses, error: pendingError } = await supabaseAdmin
    .from('member_addresses')
    .select('*')
    .ilike('status', '%PENDING%');
  
  if (pendingError) {
    console.error('Error fetching pending addresses:', pendingError);
    return;
  }
  
  console.log(`Found ${pendingAddresses.length} pending addresses:`);
  
  pendingAddresses.forEach((addr, i) => {
    console.log(`${i + 1}. ID: ${addr.id}, Address: ${addr.address}, Status: ${addr.status}`);
  });
}

checkAddressesAsAdmin().catch(console.error); 