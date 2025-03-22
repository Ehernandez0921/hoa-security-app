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
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }
    
    console.log(`[Server] Attempting to resend verification email to: ${email}`);
    
    // Attempt to resend the confirmation email
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${request.headers.get('origin')}/routes/login?registered=true`,
      }
    });
    
    if (error) {
      console.error('[Server] Error resending verification email:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log('[Server] Verification email resent successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent. Please check your inbox (and spam folder).'
    });
  } catch (error: any) {
    console.error('[Server] Unexpected error during resend verification:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 