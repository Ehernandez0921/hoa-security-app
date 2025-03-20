import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for server-side operations only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    
    console.log(`[Server] Attempting to confirm email for user: ${userId}`);
    
    // Add a small delay to ensure the user is fully created in the auth system
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Confirm the email using the admin client
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );
    
    if (error) {
      console.error('[Server] Error confirming email:', error);
      
      // Check specifically for "User not found" errors which could be timing related
      if (error.message && error.message.includes('User not found')) {
        console.log('[Server] User not found error - this might be a timing issue. The user was created but not yet available for updates.');
      }
      
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('[Server] Email confirmed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Server] Unexpected error during email confirmation:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 