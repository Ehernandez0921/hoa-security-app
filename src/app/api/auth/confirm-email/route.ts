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

// Helper function to wait for specified milliseconds
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to attempt email confirmation with retries
async function attemptEmailConfirmation(userId: string, maxRetries = 3) {
  let lastError: any = null;
  
  // Try to confirm email with fixed delay of 2 seconds
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Fixed delay of 2 seconds between attempts
      const delayMs = 2000; 
      console.log(`[Server] Waiting ${delayMs}ms before attempt ${attempt + 1}/${maxRetries}...`);
      await wait(delayMs);
      
      console.log(`[Server] Attempt ${attempt + 1}/${maxRetries} to confirm email for user: ${userId}`);
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );
      
      if (!error) {
        console.log(`[Server] Email confirmed successfully on attempt ${attempt + 1}`);
        return { success: true, error: null };
      }
      
      lastError = error;
      
      // If it's not a "User not found" error, don't retry
      if (!error.message.includes('User not found')) {
        console.error(`[Server] Non-retryable error on attempt ${attempt + 1}:`, error);
        break;
      }
      
      console.log(`[Server] User not found on attempt ${attempt + 1}, will retry`);
    } catch (error) {
      lastError = error;
      console.error(`[Server] Unexpected error on attempt ${attempt + 1}:`, error);
    }
  }
  
  console.error('[Server] Failed to confirm email after maximum retry attempts');
  return { success: false, error: lastError };
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    
    console.log(`[Server] Starting email confirmation process for user: ${userId}`);
    
    // Attempt to confirm email with retries
    const { success, error } = await attemptEmailConfirmation(userId);
    
    if (!success) {
      console.error('[Server] Email confirmation failed after all retries:', error);
      return NextResponse.json({ 
        success: false, 
        error: error?.message || 'Failed to confirm email after multiple attempts',
        code: error?.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Server] Unexpected error during email confirmation process:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 