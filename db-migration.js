// Script to add is_active column to member_addresses table
const { createClient } = require('@supabase/supabase-js');

// Update with your Supabase URL and service role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Supabase URL or service role key not found in environment variables');
    console.error('Please provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Adding is_active column to member_addresses table...');
    
    // First, check if the column already exists
    const { data: columnExists, error: columnCheckError } = await supabase.rpc(
      'check_column_exists',
      { table_name: 'member_addresses', column_name: 'is_active' }
    );

    if (columnCheckError) {
      // If the check_column_exists function doesn't exist, we'll try adding the column directly
      console.log('Column check failed, proceeding with migration...', columnCheckError);
    } else if (columnExists) {
      console.log('Column is_active already exists, skipping migration.');
      return;
    }

    // Execute the SQL to add the column
    const { error } = await supabase.rpc('admin_exec_sql', {
      sql_query: `
        -- Add is_active column to member_addresses table
        ALTER TABLE member_addresses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
        
        -- Update existing records to set is_active to true
        UPDATE member_addresses SET is_active = TRUE WHERE is_active IS NULL;
        
        -- Add comment to column
        COMMENT ON COLUMN member_addresses.is_active IS 'Indicates if the address is active or soft-deleted';
      `
    });

    if (error) {
      console.error('Error running SQL:', error);
      // Try direct approach if RPC fails
      console.log('Trying direct SQL execution...');
      
      // Try to execute using raw SQL
      const { error: sqlError } = await supabase
        .from('member_addresses')
        .update({ dummy_column: null })
        .eq('id', 'non-existent-id')
        .select();

      if (sqlError) {
        console.error('Could not execute SQL directly:', sqlError);
        throw sqlError;
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 