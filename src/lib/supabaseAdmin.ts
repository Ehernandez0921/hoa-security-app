// This file is intended for server-side use only
import 'server-only';

import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check for required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase admin credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
}

/**
 * Supabase Admin client with service role privileges - bypasses RLS
 * Only use server-side in trusted API routes, never expose to the client!
 * 
 * Note: If the service key is not available, this will return null
 * You must check for null before using this client
 */
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null; 